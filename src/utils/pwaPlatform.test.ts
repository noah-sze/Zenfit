import { describe, it, expect } from 'vitest';
import {
  detectPwaPlatform,
  isInAppBrowserUA,
  isIosDevice,
  isStandaloneDisplayMode,
} from './pwaPlatform';

describe('pwaPlatform utilities', () => {
  it('detects iOS Safari on iPhone', () => {
    const result = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(result).toEqual({
      platform: 'ios-safari',
      isInAppBrowser: false,
      isIos: true,
      isAndroid: false,
    });
  });

  it('detects iOS Chrome via CriOS', () => {
    const result = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(result).toEqual({
      platform: 'ios-chrome',
      isInAppBrowser: false,
      isIos: true,
      isAndroid: false,
    });
  });

  it('detects iPadOS 13+ desktop UA as iOS Safari', () => {
    const nav = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    };
    expect(isIosDevice(nav)).toBe(true);
    expect(detectPwaPlatform(nav).platform).toBe('ios-safari');
  });

  it('detects Android Chrome and Edge', () => {
    const chrome = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
    });
    expect(chrome).toEqual({
      platform: 'android-chrome',
      isInAppBrowser: false,
      isIos: false,
      isAndroid: true,
    });
  });

  it('detects macOS Safari separately from macOS Chrome', () => {
    const macSafari = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });
    expect(macSafari).toEqual({
      platform: 'macos-safari',
      isInAppBrowser: false,
      isIos: false,
      isAndroid: false,
    });

    const macChrome = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });
    expect(macChrome.platform).toBe('desktop-chromium');
  });

  it('detects Windows Chrome and Edge as desktop-chromium', () => {
    const winEdge = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    });
    expect(winEdge).toEqual({
      platform: 'desktop-chromium',
      isInAppBrowser: false,
      isIos: false,
      isAndroid: false,
    });
  });

  it('detects common in-app WebView browsers (WeChat, LINE, Instagram, Facebook)', () => {
    expect(isInAppBrowserUA('')).toBe(false);
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.47'
      )
    ).toBe(true);
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari Line/14.3.0'
      )
    ).toBe(true);
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Instagram 320.0.0'
      )
    ).toBe(true);
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FBAN/FBIOS;FBAV/450.0.0'
      )
    ).toBe(true);

    const wechatIos = detectPwaPlatform({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.47',
    });
    expect(wechatIos.isInAppBrowser).toBe(true);
    expect(wechatIos.platform).toBe('ios-safari');
  });

  it('evaluates standalone display mode safely', () => {
    expect(isStandaloneDisplayMode(undefined)).toBe(false);

    const mockIosStandalone = {
      navigator: { userAgent: '', standalone: true },
    } as unknown as Window;
    expect(isStandaloneDisplayMode(mockIosStandalone)).toBe(true);

    const mockStandaloneMedia = {
      navigator: { userAgent: '' },
      matchMedia: (query: string) => ({ matches: query === '(display-mode: standalone)' }),
    } as unknown as Window;
    expect(isStandaloneDisplayMode(mockStandaloneMedia)).toBe(true);

    const mockBrowserMedia = {
      navigator: { userAgent: '' },
      matchMedia: () => ({ matches: false }),
    } as unknown as Window;
    expect(isStandaloneDisplayMode(mockBrowserMedia)).toBe(false);
  });
});
