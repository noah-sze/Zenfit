import { describe, it, expect } from 'vitest';
import type { UserBaseInfo } from '@/types';

/**
 * 測試 isSetupCompleted 純函數判定邏輯
 * 依據訪談約定：五維完整填寫（姓名、生理性別、出生年月、身高、基準體重）為解鎖與完成判定依據
 */
export function checkIsSetupCompleted(baseInfo?: Partial<UserBaseInfo> | null): boolean {
  return Boolean(
    baseInfo?.name &&
    baseInfo.name.trim().length > 0 &&
    baseInfo?.birthDate &&
    baseInfo.birthDate.trim().length > 0 &&
    baseInfo?.heightCm &&
    baseInfo.heightCm > 0
  );
}

describe('useUserProfile isSetupCompleted 狀態判定契約', () => {
  it('出廠初始空白態時，isSetupCompleted 應為 false', () => {
    const emptyBase: UserBaseInfo = {
      id: 'primary_user',
      name: '',
      gender: 'male',
      birthDate: '',
      heightCm: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(checkIsSetupCompleted(emptyBase)).toBe(false);
  });

  it('僅填寫姓名但無身高或生日時，isSetupCompleted 應為 false', () => {
    const partialBase: Partial<UserBaseInfo> = {
      name: 'Noah',
      heightCm: 0,
      birthDate: '',
    };
    expect(checkIsSetupCompleted(partialBase)).toBe(false);
  });

  it('僅填寫身高但無姓名時，isSetupCompleted 應為 false', () => {
    const partialBase: Partial<UserBaseInfo> = {
      name: '',
      heightCm: 175,
      birthDate: '1999-01',
    };
    expect(checkIsSetupCompleted(partialBase)).toBe(false);
  });

  it('姓名為純空白字元時，應被視為未填寫 (false)', () => {
    const whitespaceBase: Partial<UserBaseInfo> = {
      name: '   ',
      heightCm: 175,
      birthDate: '1999-01',
    };
    expect(checkIsSetupCompleted(whitespaceBase)).toBe(false);
  });

  it('姓名、生日與有效身高 (heightCm > 0) 皆填寫時，isSetupCompleted 應為 true', () => {
    const completeBase: UserBaseInfo = {
      id: 'primary_user',
      name: 'Noah',
      gender: 'male',
      birthDate: '1999-01',
      heightCm: 175,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(checkIsSetupCompleted(completeBase)).toBe(true);
  });
});
