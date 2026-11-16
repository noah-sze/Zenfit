import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInAppNavigation } from './useInAppNavigation';

describe('useInAppNavigation', () => {
  beforeEach(() => {
    useInAppNavigation.setState({
      activeTab: 'dashboard',
      subViewStack: [],
    });
    vi.restoreAllMocks();
  });

  it('初始狀態應為 dashboard 且視圖棧為空', () => {
    const state = useInAppNavigation.getState();
    expect(state.activeTab).toBe('dashboard');
    expect(state.subViewStack).toEqual([]);
  });

  it('setActiveTab 應能切換主分頁並清空子視圖棧', () => {
    useInAppNavigation.getState().pushSubView({ type: 'settings' });
    expect(useInAppNavigation.getState().subViewStack.length).toBe(1);

    useInAppNavigation.getState().setActiveTab('diet');
    expect(useInAppNavigation.getState().activeTab).toBe('diet');
    expect(useInAppNavigation.getState().subViewStack).toEqual([]);
  });

  it('pushSubView 與 popSubView 應精確推入與回退', () => {
    const mockPushState = vi.fn();
    (globalThis as any).window = {
      history: {
        pushState: mockPushState,
      },
    };

    useInAppNavigation.getState().pushSubView({ type: 'settings' });
    expect(mockPushState).toHaveBeenCalledWith({ zenfitSubViewDepth: 1 }, '', '/app');
    expect(useInAppNavigation.getState().subViewStack).toEqual([{ type: 'settings' }]);

    useInAppNavigation.getState().pushSubView({ type: 'foods', id: 'chicken' });
    expect(mockPushState).toHaveBeenCalledWith({ zenfitSubViewDepth: 2 }, '', '/app');
    expect(useInAppNavigation.getState().subViewStack.length).toBe(2);

    useInAppNavigation.getState().popSubView();
    expect(useInAppNavigation.getState().subViewStack).toEqual([{ type: 'settings' }]);

    useInAppNavigation.getState().popSubView();
    expect(useInAppNavigation.getState().subViewStack).toEqual([]);

    // 棧空時 popSubView 不拋錯
    useInAppNavigation.getState().popSubView();
    expect(useInAppNavigation.getState().subViewStack).toEqual([]);
  });

  it('pushSubView 遇見棧內已存在目標時應去重回捲而非無限疊加', () => {
    const mockPushState = vi.fn();
    const mockGo = vi.fn();
    (globalThis as any).window = {
      history: {
        pushState: mockPushState,
        go: mockGo,
        state: { zenfitSubViewDepth: 3 },
      },
    };

    useInAppNavigation.getState().pushSubView({ type: 'exercises', id: 'ex-1', mode: 'exercises' });
    useInAppNavigation.getState().pushSubView({ type: 'exercises', id: 'rt-1', mode: 'routines' });
    useInAppNavigation.getState().pushSubView({ type: 'exercises', id: 'ex-2', mode: 'exercises' });
    expect(useInAppNavigation.getState().subViewStack.length).toBe(3);
    expect(mockPushState).toHaveBeenCalledTimes(3);

    // 點擊棧頂相同目標：不應推入也不應呼叫 go
    useInAppNavigation.getState().pushSubView({ type: 'exercises', id: 'ex-2', mode: 'exercises' });
    expect(mockPushState).toHaveBeenCalledTimes(3);
    expect(mockGo).not.toHaveBeenCalled();

    // 從 ex-2 回到已存在於 index 0 的 ex-1：應回捲 2 層
    useInAppNavigation.getState().pushSubView({ type: 'exercises', id: 'ex-1', mode: 'exercises' });
    expect(mockPushState).toHaveBeenCalledTimes(3);
    expect(mockGo).toHaveBeenCalledWith(-2);

    // truncateSubViews 應精確截斷至目標深度
    useInAppNavigation.getState().truncateSubViews(1);
    expect(useInAppNavigation.getState().subViewStack).toEqual([
      { type: 'exercises', id: 'ex-1', mode: 'exercises' },
    ]);
  });
});
