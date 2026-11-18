import { describe, it, expect, beforeEach } from 'vitest';
import { useInAppNavigation } from './useInAppNavigation';

describe('useInAppNavigation', () => {
  beforeEach(() => {
    useInAppNavigation.setState({
      activeTab: 'dashboard',
    });
  });

  it('初始狀態應為 dashboard', () => {
    expect(useInAppNavigation.getState().activeTab).toBe('dashboard');
  });

  it('setActiveTab 應能精確切換主分頁', () => {
    useInAppNavigation.getState().setActiveTab('diet');
    expect(useInAppNavigation.getState().activeTab).toBe('diet');

    useInAppNavigation.getState().setActiveTab('workout');
    expect(useInAppNavigation.getState().activeTab).toBe('workout');

    useInAppNavigation.getState().setActiveTab('body');
    expect(useInAppNavigation.getState().activeTab).toBe('body');
  });
});
