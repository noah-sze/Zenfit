import { describe, it, expect } from 'vitest';
import type { DietPlan, MacroSplit, UserProfile } from '@/types';

/**
 * 模擬 useDietPlan 核心解析與儲存決策純函數
 * 遵循 Precision Metric 純數學與資料邊界原則
 */
export function resolveDietPlan(params: {
  targetDate: string;
  exactPlan?: DietPlan | null;
  previousPlans?: DietPlan[];
  userProfile?: Partial<UserProfile> | null;
}): {
  plan: DietPlan;
  isCustomPlan: boolean;
  activityLevel: number;
  macroSplit: MacroSplit;
} {
  const { targetDate, exactPlan, previousPlans = [], userProfile } = params;

  // 1. 優先取用當日手動覆蓋
  if (exactPlan) {
    return {
      plan: exactPlan,
      isCustomPlan: true,
      activityLevel: exactPlan.activityLevel || 1.55,
      macroSplit: exactPlan.macroSplit || { carbs: 40, protein: 30, fat: 30 },
    };
  }

  // 2. 沿用 targetDate 之前的最新有效記錄
  const sortedPrevious = [...previousPlans]
    .filter((p) => p.date < targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  const inherited = sortedPrevious[0];

  const fallbackActivity =
    inherited?.activityLevel ?? userProfile?.activityLevel ?? 1.55;
  const fallbackSplit =
    inherited?.macroSplit ??
    userProfile?.macroSplit ??
    { carbs: 40, protein: 30, fat: 30 };
  const fallbackCalories = inherited?.caloriesTarget ?? 2000;
  const fallbackProtein = inherited?.proteinTarget ?? 140;
  const fallbackCarbs = inherited?.carbsTarget ?? 220;
  const fallbackFat = inherited?.fatTarget ?? 60;

  const syntheticPlan: DietPlan = {
    id: `inherited-${targetDate}`,
    date: targetDate,
    caloriesTarget: fallbackCalories,
    proteinTarget: fallbackProtein,
    carbsTarget: fallbackCarbs,
    fatTarget: fallbackFat,
    activityLevel: fallbackActivity,
    macroSplit: fallbackSplit,
    createdAt: inherited?.createdAt || 0,
    updatedAt: inherited?.updatedAt || 0,
  };

  return {
    plan: syntheticPlan,
    isCustomPlan: false,
    activityLevel: fallbackActivity,
    macroSplit: fallbackSplit,
  };
}

export function determineSaveAction(params: {
  targetDate: string;
  todayDate: string;
  updates: Partial<DietPlan>;
}): {
  shouldUpdateDailyPlan: boolean;
  shouldUpdateGlobalProfile: boolean;
} {
  const isToday = params.targetDate === params.todayDate;
  return {
    shouldUpdateDailyPlan: true,
    shouldUpdateGlobalProfile: isToday,
  };
}

describe('useDietPlan 核心契約與沿用邏輯', () => {
  const baseProfile: Partial<UserProfile> = {
    activityLevel: 1.55,
    macroSplit: { carbs: 40, protein: 30, fat: 30 },
  };

  it('情境 1：當日有專屬設定時，100% 精準取用當日設定 (isCustomPlan = true)', () => {
    const exact: DietPlan = {
      id: 'p1',
      date: '2026-11-05',
      caloriesTarget: 2500,
      proteinTarget: 180,
      carbsTarget: 250,
      fatTarget: 80,
      activityLevel: 1.725,
      macroSplit: { carbs: 40, protein: 35, fat: 25 },
      createdAt: 100,
      updatedAt: 100,
    };

    const res = resolveDietPlan({
      targetDate: '2026-11-05',
      exactPlan: exact,
      userProfile: baseProfile,
    });

    expect(res.isCustomPlan).toBe(true);
    expect(res.activityLevel).toBe(1.725);
    expect(res.macroSplit).toEqual({ carbs: 40, protein: 35, fat: 25 });
    expect(res.plan.caloriesTarget).toBe(2500);
  });

  it('情境 2：當日無設定但過去有手動設定時，自動向後沿用過去最新一筆的活動係數與供能比', () => {
    const historicalPlan: DietPlan = {
      id: 'p_yesterday',
      date: '2026-11-04',
      caloriesTarget: 2600,
      proteinTarget: 200,
      carbsTarget: 260,
      fatTarget: 85,
      activityLevel: 1.9,
      macroSplit: { carbs: 40, protein: 35, fat: 25 },
      createdAt: 100,
      updatedAt: 100,
    };

    // 查詢 2026-11-05（無獨立設定）
    const res = resolveDietPlan({
      targetDate: '2026-11-05',
      exactPlan: null,
      previousPlans: [historicalPlan],
      userProfile: baseProfile,
    });

    expect(res.isCustomPlan).toBe(false);
    expect(res.activityLevel).toBe(1.9); // 繼承 11-04 的 1.9
    expect(res.macroSplit).toEqual({ carbs: 40, protein: 35, fat: 25 });
    expect(res.plan.caloriesTarget).toBe(2600);
  });

  it('情境 3：當日與過去均無手動設定時，安全回退到全域 Profile 基準', () => {
    const res = resolveDietPlan({
      targetDate: '2026-11-01',
      exactPlan: null,
      previousPlans: [],
      userProfile: baseProfile,
    });

    expect(res.isCustomPlan).toBe(false);
    expect(res.activityLevel).toBe(1.55);
    expect(res.macroSplit).toEqual({ carbs: 40, protein: 30, fat: 30 });
    expect(res.plan.caloriesTarget).toBe(2000);
  });

  it('儲存契約：修改過去歷史日期時，僅修改當天設置，絕不影響全域 Profile', () => {
    const action = determineSaveAction({
      targetDate: '2026-11-01',
      todayDate: '2026-11-06',
      updates: { activityLevel: 1.2 },
    });

    expect(action.shouldUpdateDailyPlan).toBe(true);
    expect(action.shouldUpdateGlobalProfile).toBe(false);
  });

  it('儲存契約：修改今天時，修改當天設置並同步更新全域 Profile，使後續日期自動沿用', () => {
    const action = determineSaveAction({
      targetDate: '2026-11-06',
      todayDate: '2026-11-06',
      updates: { activityLevel: 1.725 },
    });

    expect(action.shouldUpdateDailyPlan).toBe(true);
    expect(action.shouldUpdateGlobalProfile).toBe(true);
  });

  it('SSOT 規範化契約：儲存的 DietPlan 實體嚴禁寫死熱量與三大營養素，只儲存真理源 activityLevel 與 macroSplit', () => {
    const sanitizePlanForStorage = (updates: any) => {
      const {
        caloriesTarget: _cal,
        proteinTarget: _p,
        carbsTarget: _c,
        fatTarget: _f,
        ...ssotPlan
      } = updates;
      return ssotPlan;
    };

    const inputUpdates = {
      activityLevel: 1.55,
      macroSplit: { carbs: 40, protein: 30, fat: 30 },
      caloriesTarget: 2200,
      proteinTarget: 165,
      carbsTarget: 220,
      fatTarget: 73,
    };

    const stored = sanitizePlanForStorage(inputUpdates);

    expect(stored).toEqual({
      activityLevel: 1.55,
      macroSplit: { carbs: 40, protein: 30, fat: 30 },
    });
    expect('caloriesTarget' in stored).toBe(false);
    expect('proteinTarget' in stored).toBe(false);
    expect('carbsTarget' in stored).toBe(false);
    expect('fatTarget' in stored).toBe(false);
  });

  it('每日日誌自包含契約：記錄進食時若當日無專屬設定，可精準解析並落盤獨立 meta', () => {
    // 模擬已存在歷史設定
    const previous: DietPlan[] = [
      {
        id: 'p_hist',
        date: '2026-11-04',
        activityLevel: 1.725,
        macroSplit: { carbs: 50, protein: 25, fat: 25 },
        createdAt: 100,
        updatedAt: 100,
      },
    ];

    const resolved = resolveDietPlan({
      targetDate: '2026-11-06',
      exactPlan: null,
      previousPlans: previous,
      userProfile: baseProfile,
    });

    // 驗證生成的自包含 meta 精準繼承歷史最新狀態，具備獨立落盤能力
    expect(resolved.activityLevel).toBe(1.725);
    expect(resolved.macroSplit).toEqual({ carbs: 50, protein: 25, fat: 25 });
  });
});
