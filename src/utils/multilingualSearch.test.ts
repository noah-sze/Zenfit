// ============================================================================
// Zenfit 多語言與繁簡互通搜尋模組單元測試 (multilingualSearch Unit Tests)
// 包含 Phase 1 繁簡/Slug、Phase 2 權威雙語別名庫、Phase 3 拼音首字母與極限效能延遲驗證
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  matchesMultilingual,
  normalizeChinese,
  toTraditional,
  toSimplified,
  getAliasesForTarget,
  toPinyinInitials,
} from './multilingualSearch';
import { NATURAL_FOOD_IDS, DEFAULT_NATURAL_FOODS } from '@/services/db/defaultNaturalFoods';
import { DEFAULT_EXERCISE_IDS, DEFAULT_EXERCISES } from '@/services/db/defaultExercises';
import { DEFAULT_EQUIPMENT_IDS } from '@/services/db/defaultEquipments';

describe('multilingualSearch', () => {
  describe('Phase 1: normalizeChinese & 繁簡字轉換工具', () => {
    it('應能將常見簡體字正確轉換為繁體字', () => {
      expect(toTraditional('卧推')).toBe('臥推');
      expect(toTraditional('杠铃')).toBe('槓鈴');
      expect(toTraditional('鸡胸肉')).toBe('雞胸肉');
      expect(toTraditional('虾仁')).toBe('蝦仁');
      expect(toTraditional('牛肉面')).toBe('牛肉麵');
      expect(toTraditional('哑铃深蹲')).toBe('啞鈴深蹲');
      expect(toTraditional('金枪鱼')).toBe('金槍魚');
    });

    it('應能將常見繁體字正確轉換為簡體字', () => {
      expect(toSimplified('槓鈴臥推')).toBe('杠铃卧推');
      expect(toSimplified('雞胸肉')).toBe('鸡胸肉');
      expect(toSimplified('蝦仁')).toBe('虾仁');
      expect(toSimplified('牛肉麵')).toBe('牛肉面');
      expect(toSimplified('啞鈴深蹲')).toBe('哑铃深蹲');
    });

    it('normalizeChinese 應能將簡繁皆正規化為一致的繁體字串', () => {
      expect(normalizeChinese('杠铃卧推')).toBe(normalizeChinese('槓鈴臥推'));
      expect(normalizeChinese('鸡胸肉')).toBe(normalizeChinese('雞胸肉'));
      expect(normalizeChinese('牛肉面')).toBe(normalizeChinese('牛肉麵'));
    });
  });

  describe('Phase 1: 簡體搜繁體 (Simplified Query on Traditional Targets)', () => {
    it('簡體「卧推」應能命中繁體「槓鈴臥推」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('卧推', target, 'exercise')).toBe(true);
    });

    it('簡體「鸡胸」應能命中繁體「雞胸肉」', () => {
      const target = {
        id: NATURAL_FOOD_IDS.chicken_breast_raw,
        name: '雞胸肉',
      };
      expect(matchesMultilingual('鸡胸', target, 'food')).toBe(true);
    });

    it('簡體「虾」應能命中繁體「草蝦」', () => {
      const target = {
        name: '草蝦',
      };
      expect(matchesMultilingual('虾', target, 'food')).toBe(true);
    });

    it('簡體「牛肉面」應能命中繁體「紅燒牛肉麵」', () => {
      const target = {
        name: '紅燒牛肉麵',
      };
      expect(matchesMultilingual('牛肉面', target, 'food')).toBe(true);
    });

    it('簡體「哑铃」應能命中繁體「啞鈴側平舉」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.dumbbell_lateral_raise,
        name: '啞鈴側平舉',
      };
      expect(matchesMultilingual('哑铃', target, 'exercise')).toBe(true);
    });
  });

  describe('Phase 1: 繁體搜簡體 (Traditional Query on Simplified Targets)', () => {
    it('繁體「槓鈴」應能命中簡體「杠铃深蹲」', () => {
      const customTarget = {
        name: '杠铃深蹲',
      };
      expect(matchesMultilingual('槓鈴', customTarget, 'exercise')).toBe(true);
    });

    it('繁體「雞胸」應能命中簡體自訂食材「低脂鸡胸肉」', () => {
      const customTarget = {
        name: '低脂鸡胸肉',
        brand: '优品',
      };
      expect(matchesMultilingual('雞胸', customTarget, 'food')).toBe(true);
    });

    it('繁體「臥推」應能命中簡體自訂動作「哑铃卧推」', () => {
      const customTarget = {
        name: '哑铃卧推',
      };
      expect(matchesMultilingual('臥推', customTarget, 'exercise')).toBe(true);
    });
  });

  describe('Phase 1: 英文 Slug / Key 搜尋 (English Slug Query)', () => {
    it('英文「bench」應能命中預設「槓鈴臥推」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('bench', target, 'exercise')).toBe(true);
    });

    it('英文「press」應能命中「槓鈴臥推」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('press', target, 'exercise')).toBe(true);
    });

    it('英文「bench press」多單字應能命中「槓鈴臥推」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('bench press', target, 'exercise')).toBe(true);
    });

    it('英文「squat」應能命中預設「槓鈴深蹲」', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.barbell_squat,
        name: '槓鈴深蹲',
      };
      expect(matchesMultilingual('squat', target, 'exercise')).toBe(true);
    });

    it('英文「beef」應能命中預設「牛腱肉」', () => {
      const target = {
        id: NATURAL_FOOD_IDS.beef_shank,
        name: '牛腱肉',
      };
      expect(matchesMultilingual('beef', target, 'food')).toBe(true);
    });

    it('應能命中器械英文 Slug（如 barbell 命中「槓鈴」）', () => {
      const equipTarget = {
        id: DEFAULT_EQUIPMENT_IDS.barbell,
        name: '槓鈴',
      };
      expect(matchesMultilingual('barbell', equipTarget)).toBe(true);
    });
  });

  describe('Phase 2: 權威領域雙語別名庫 (Domain Aliases Matching)', () => {
    it('飲食別名：土豆 -> 馬鈴薯 (potato_raw)', () => {
      const potatoTarget = {
        id: NATURAL_FOOD_IDS.potato_raw,
        name: '馬鈴薯',
      };
      expect(matchesMultilingual('土豆', potatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('洋芋', potatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('spud', potatoTarget, 'food')).toBe(true);
    });

    it('飲食別名：西紅柿 -> 番茄 (beef_tomato_raw)', () => {
      const tomatoTarget = {
        id: NATURAL_FOOD_IDS.beef_tomato_raw,
        name: '牛番茄',
      };
      expect(matchesMultilingual('西紅柿', tomatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('洋柿子', tomatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('tomato', tomatoTarget, 'food')).toBe(true);
    });

    it('飲食別名：三文魚 -> 鮭魚 (salmon_atlantic_raw)', () => {
      const salmonTarget = {
        id: NATURAL_FOOD_IDS.salmon_atlantic_raw,
        name: '鮭魚',
      };
      expect(matchesMultilingual('三文魚', salmonTarget, 'food')).toBe(true);
      expect(matchesMultilingual('salmon', salmonTarget, 'food')).toBe(true);
    });

    it('飲食別名：牛油果 -> 酪梨 (avocado_raw)', () => {
      const avocadoTarget = {
        id: NATURAL_FOOD_IDS.avocado_raw,
        name: '酪梨',
      };
      expect(matchesMultilingual('牛油果', avocadoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('鱷梨', avocadoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('avocado', avocadoTarget, 'food')).toBe(true);
    });

    it('飲食別名：希臘酸奶 -> 希臘優格 (greek_yogurt_plain_whole)', () => {
      const yogurtTarget = {
        id: NATURAL_FOOD_IDS.greek_yogurt_plain_whole,
        name: '全脂希臘優格',
      };
      expect(matchesMultilingual('希臘酸奶', yogurtTarget, 'food')).toBe(true);
      expect(matchesMultilingual('脱乳清酸奶', yogurtTarget, 'food')).toBe(true);
    });

    it('飲食別名：茅屋芝士 -> 茅屋乳酪 (cottage_cheese)', () => {
      const cottageTarget = {
        id: NATURAL_FOOD_IDS.cottage_cheese,
        name: '茅屋起司',
      };
      expect(matchesMultilingual('茅屋芝士', cottageTarget, 'food')).toBe(true);
      expect(matchesMultilingual('茅屋乳酪', cottageTarget, 'food')).toBe(true);
      expect(matchesMultilingual('鄉村奶酪', cottageTarget, 'food')).toBe(true);
    });

    it('飲食別名：紅薯 / 番薯 -> 地瓜 (sweet_potato_yellow_raw)', () => {
      const sweetPotatoTarget = {
        id: NATURAL_FOOD_IDS.sweet_potato_yellow_raw,
        name: '黃金地瓜',
      };
      expect(matchesMultilingual('紅薯', sweetPotatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('番薯', sweetPotatoTarget, 'food')).toBe(true);
      expect(matchesMultilingual('yam', sweetPotatoTarget, 'food')).toBe(true);
    });

    it('飲食別名：嫩肩里肌 -> 牛板腱 (beef_top_blade)', () => {
      const topBladeTarget = {
        id: NATURAL_FOOD_IDS.beef_top_blade,
        name: '牛板腱',
      };
      expect(matchesMultilingual('嫩肩里肌', topBladeTarget, 'food')).toBe(true);
      expect(matchesMultilingual('牡蠣肉', topBladeTarget, 'food')).toBe(true);
      expect(matchesMultilingual('blade steak', topBladeTarget, 'food')).toBe(true);
    });

    it('飲食別名：牛里脊 -> 牛菲力 (beef_tenderloin)', () => {
      const tenderloinTarget = {
        id: NATURAL_FOOD_IDS.beef_tenderloin,
        name: '牛菲力',
      };
      expect(matchesMultilingual('牛里脊', tenderloinTarget, 'food')).toBe(true);
      expect(matchesMultilingual('filet mignon', tenderloinTarget, 'food')).toBe(true);
    });

    it('飲食別名：雪蓮子 -> 鷹嘴豆 (chickpea_dry)', () => {
      const chickpeaTarget = {
        id: NATURAL_FOOD_IDS.chickpea_dry,
        name: '鷹嘴豆',
      };
      expect(matchesMultilingual('雪蓮子', chickpeaTarget, 'food')).toBe(true);
      expect(matchesMultilingual('雞豆', chickpeaTarget, 'food')).toBe(true);
      expect(matchesMultilingual('garbanzo', chickpeaTarget, 'food')).toBe(true);
    });

    it('動作別名：OHP -> 站姿肩推 (standing_overhead_press)', () => {
      const ohpTarget = {
        id: DEFAULT_EXERCISE_IDS.standing_overhead_press,
        name: '站姿槓鈴推舉',
      };
      expect(matchesMultilingual('OHP', ohpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('ohp', ohpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('軍事推舉', ohpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('站姿肩推', ohpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('肩推', ohpTarget, 'exercise')).toBe(true);
    });

    it('動作別名：RDL -> 羅馬尼亞硬舉 (romanian_deadlift)', () => {
      const rdlTarget = {
        id: DEFAULT_EXERCISE_IDS.romanian_deadlift,
        name: '羅馬尼亞硬舉',
      };
      expect(matchesMultilingual('RDL', rdlTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('rdl', rdlTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('直腿硬拉', rdlTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('直腿硬舉', rdlTarget, 'exercise')).toBe(true);
    });

    it('動作別名：BSS -> 保加利亞分腿蹲 (bulgarian_split_squat)', () => {
      const bssTarget = {
        id: DEFAULT_EXERCISE_IDS.bulgarian_split_squat,
        name: '保加利亞分腿蹲',
      };
      expect(matchesMultilingual('BSS', bssTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('bss', bssTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('保加利亞單腿蹲', bssTarget, 'exercise')).toBe(true);
    });

    it('動作別名：BP -> 槓鈴臥推 (bench_press)', () => {
      const bpTarget = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('BP', bpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('bp', bpTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('平面臥推', bpTarget, 'exercise')).toBe(true);
    });

    it('動作別名：DL -> 傳統硬舉 (deadlift)', () => {
      const dlTarget = {
        id: DEFAULT_EXERCISE_IDS.deadlift,
        name: '傳統硬舉',
      };
      expect(matchesMultilingual('DL', dlTarget, 'exercise')).toBe(true);
      expect(matchesMultilingual('硬拉', dlTarget, 'exercise')).toBe(true);
    });

    it('自訂無 ID 項目亦能透過正名命中權威別名庫', () => {
      const customFood = { name: '馬鈴薯' };
      expect(matchesMultilingual('土豆', customFood, 'food')).toBe(true);
      expect(matchesMultilingual('洋芋', customFood, 'food')).toBe(true);

      const customExercise = { name: '站姿肩推' };
      expect(matchesMultilingual('OHP', customExercise, 'exercise')).toBe(true);
    });

    it('getAliasesForTarget 查詢函數能正確返回去重小寫別名列表', () => {
      const aliases = getAliasesForTarget(NATURAL_FOOD_IDS.potato_raw, '馬鈴薯');
      expect(aliases).toContain('土豆');
      expect(aliases).toContain('洋芋');
      expect(aliases).toContain('potato');
    });
  });

  describe('Phase 3: 拼音首字母極速穿透 (Pinyin Initials Matching)', () => {
    it('toPinyinInitials 工具能將漢字正確轉化為首字母', () => {
      expect(toPinyinInitials('雞胸肉')).toBe('jxr');
      expect(toPinyinInitials('杠铃卧推')).toBe('glwt');
      expect(toPinyinInitials('槓鈴臥推')).toBe('glwt');
      expect(toPinyinInitials('硬舉')).toBe('yj');
      expect(toPinyinInitials('土豆')).toBe('td');
      expect(toPinyinInitials('馬鈴薯')).toBe('mls');
      expect(toPinyinInitials('西藍花')).toBe('xlh');
      expect(toPinyinInitials('BB Row 划船')).toBe('bbrowhc');
    });

    it('拼音首字母：jxr -> 雞胸肉', () => {
      const target = {
        id: NATURAL_FOOD_IDS.chicken_breast_raw,
        name: '雞胸肉',
      };
      expect(matchesMultilingual('jxr', target, 'food')).toBe(true);
      expect(matchesMultilingual('JXR', target, 'food')).toBe(true);
    });

    it('拼音首字母：glwt -> 槓鈴臥推', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.bench_press,
        name: '槓鈴臥推',
      };
      expect(matchesMultilingual('glwt', target, 'exercise')).toBe(true);
      expect(matchesMultilingual('GLWT', target, 'exercise')).toBe(true);
    });

    it('拼音首字母：fsl -> 西藍花 / 青花菜', () => {
      const target = {
        id: NATURAL_FOOD_IDS.broccoli_raw,
        name: '青花菜',
      };
      expect(matchesMultilingual('fsl', target, 'food')).toBe(true);
      expect(matchesMultilingual('xlh', target, 'food')).toBe(true);
    });

    it('拼音首字母：td -> 土豆 / 馬鈴薯', () => {
      const potatoTarget = {
        id: NATURAL_FOOD_IDS.potato_raw,
        name: '馬鈴薯',
      };
      expect(matchesMultilingual('td', potatoTarget, 'food')).toBe(true);

      const customTudou = {
        name: '土豆',
      };
      expect(matchesMultilingual('td', customTudou, 'food')).toBe(true);
    });

    it('拼音首字母：yj -> 硬舉 (deadlift)', () => {
      const target = {
        id: DEFAULT_EXERCISE_IDS.deadlift,
        name: '傳統硬舉',
      };
      // 「傳統硬舉」拼音為 ctyj，包含 yj
      expect(matchesMultilingual('yj', target, 'exercise')).toBe(true);
    });

    it('拼音首字母：單字母（如 "j" 或 "g"）不應觸發拼音縮寫以防止廣泛誤命中', () => {
      const target = {
        id: NATURAL_FOOD_IDS.chicken_breast_raw,
        name: '雞胸肉',
      };
      // "j" 長度為 1，不應泛濫命中
      expect(matchesMultilingual('j', target, 'food')).toBe(false);
      expect(matchesMultilingual('z', target, 'food')).toBe(false);
    });
  });

  describe('效能延遲基準測試 (Performance Latency Benchmark)', () => {
    it('在 1,000 筆資料下連續檢索，單次耗時應 < 1.0ms', () => {
      // 1. 建立 1,000 筆混合目標實體（天然食物 + 預設動作 + 自訂擴展數據）
      const dataset: { id: string; name: string; brand?: string; notes?: string }[] = [];

      for (const food of DEFAULT_NATURAL_FOODS) {
        dataset.push({ id: food.id, name: food.name, notes: '天然原型食材' });
      }

      for (const ex of DEFAULT_EXERCISES) {
        dataset.push({ id: ex.id, name: ex.name, notes: '肌力訓練動作' });
      }

      // 擴展填滿至 1,000+ 筆
      let counter = 0;
      while (dataset.length < 1000) {
        counter++;
        dataset.push({
          id: `custom-mock-${counter}`,
          name: `自訂高蛋白食物 ${counter} 號（低脂雞胸與燕麥混合餐）`,
          brand: `品牌 ${counter % 20}`,
          notes: '專用訓練增肌補充備忘',
        });
      }

      expect(dataset.length).toBeGreaterThanOrEqual(1000);

      // 2. 測試 5 組不同模式的高頻查詢
      const testQueries = ['土豆', 'OHP', 'jxr', 'glwt', 'beef'];

      // 預熱 JIT
      for (const q of testQueries) {
        for (let i = 0; i < dataset.length; i++) {
          matchesMultilingual(q, dataset[i]);
        }
      }

      // 3. 正式計時連續檢索
      const startTime = performance.now();
      let matchCount = 0;

      for (const q of testQueries) {
        for (let i = 0; i < dataset.length; i++) {
          if (matchesMultilingual(q, dataset[i])) {
            matchCount++;
          }
        }
      }

      const totalTimeMs = performance.now() - startTime;
      const totalSearches = testQueries.length * dataset.length; // 5 * 1000 = 5000 次比對
      const avgTimePerItemMs = totalTimeMs / totalSearches;
      const totalTimePerFilterRunMs = totalTimeMs / testQueries.length; // 遍歷完整 1000 筆資料的單次完整檢索耗時

      console.log(`[Performance Benchmark] 1,000 筆清單完整過濾平均耗時: ${totalTimePerFilterRunMs.toFixed(3)} ms`);
      console.log(`[Performance Benchmark] 單筆目標比對耗時: ${(avgTimePerItemMs * 1000).toFixed(2)} µs`);
      console.log(`[Performance Benchmark] 總比對次數: ${totalSearches}, 總命中次數: ${matchCount}`);

      // 驗證在 1,000 筆資料下連續檢索，單次耗時（單筆目標檢索比對耗時）嚴格小於 1.0ms
      expect(avgTimePerItemMs).toBeLessThan(1.0);
      // 驗證 1,000 筆資料完整過濾耗時穩定在 60fps 影格預算（16.6ms）內
      expect(totalTimePerFilterRunMs).toBeLessThan(16.0);
    });
  });

  describe('邊界與未匹配條件防禦 (Boundary & Defense Cases)', () => {
    const benchPress = {
      id: DEFAULT_EXERCISE_IDS.bench_press,
      name: '槓鈴臥推',
    };

    it('完全不相干關鍵字應返回 false', () => {
      expect(matchesMultilingual('西瓜', benchPress, 'exercise')).toBe(false);
      expect(matchesMultilingual('watermelon', benchPress, 'exercise')).toBe(false);
      expect(matchesMultilingual('pizza', benchPress, 'exercise')).toBe(false);
    });

    it('純數字、空白或特殊符號安全穿透不報錯', () => {
      expect(matchesMultilingual('', benchPress, 'exercise')).toBe(false);
      expect(matchesMultilingual('   ', benchPress, 'exercise')).toBe(false);
      expect(matchesMultilingual('12345', benchPress, 'exercise')).toBe(false);
      expect(matchesMultilingual('!@#$%^&*()', benchPress, 'exercise')).toBe(false);
    });
  });
});
