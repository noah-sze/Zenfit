export type PwaGuidePlatform =
  | 'ios-safari'
  | 'ios-chrome'
  | 'android-chrome'
  | 'macos-safari'
  | 'desktop-chromium';

export interface PwaPlatformDetection {
  platform: PwaGuidePlatform;
  isInAppBrowser: boolean;
  isIos: boolean;
  isAndroid: boolean;
}

export interface NavigatorLike {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

const IN_APP_BROWSER_PATTERN =
  /MicroMessenger|Line\/|Instagram|FBAN|FBAV|FB_IAB|Twitter|Threads|Weibo|DingTalk|Lark|Feishu|BytedanceWebview|TikTok|musical_ly|Snapchat|KAKAOTALK|XiaoHongShu|QQ\/\d/i;

const IOS_UA_PATTERN = /iPhone|iPad|iPod/i;
const IOS_NON_SAFARI_BROWSER_PATTERN = /CriOS|EdgiOS|FxiOS|OPiOS/i;
const ANDROID_UA_PATTERN = /Android/i;
const MACOS_UA_PATTERN = /Macintosh|Mac OS X/i;
const SAFARI_UA_PATTERN = /Safari/i;
const NON_SAFARI_DESKTOP_PATTERN = /Chrome|Chromium|Edg|OPR|Opera|Firefox|Brave|Vivaldi/i;

export function isInAppBrowserUA(userAgent: string): boolean {
  if (!userAgent) return false;
  return IN_APP_BROWSER_PATTERN.test(userAgent);
}

export function isIosDevice(nav: NavigatorLike): boolean {
  const ua = nav.userAgent || '';
  if (IOS_UA_PATTERN.test(ua)) {
    return true;
  }
  // iPadOS 13+ defaults to a macOS Safari User-Agent with multi-touch support
  if (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1) {
    return true;
  }
  return false;
}

export function detectPwaPlatform(nav: NavigatorLike): PwaPlatformDetection {
  const ua = nav.userAgent || '';
  const isInAppBrowser = isInAppBrowserUA(ua);
  const isIos = isIosDevice(nav);
  const isAndroid = !isIos && ANDROID_UA_PATTERN.test(ua);

  if (isIos) {
    const platform: PwaGuidePlatform = IOS_NON_SAFARI_BROWSER_PATTERN.test(ua)
      ? 'ios-chrome'
      : 'ios-safari';
    return { platform, isInAppBrowser, isIos, isAndroid: false };
  }

  if (isAndroid) {
    return { platform: 'android-chrome', isInAppBrowser, isIos: false, isAndroid: true };
  }

  if (
    MACOS_UA_PATTERN.test(ua) &&
    SAFARI_UA_PATTERN.test(ua) &&
    !NON_SAFARI_DESKTOP_PATTERN.test(ua)
  ) {
    return { platform: 'macos-safari', isInAppBrowser, isIos: false, isAndroid: false };
  }

  return { platform: 'desktop-chromium', isInAppBrowser, isIos: false, isAndroid: false };
}

export function isStandaloneDisplayMode(win: Window | undefined = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!win) return false;
  const nav = win.navigator as NavigatorLike | undefined;
  if (nav?.standalone === true) {
    return true;
  }
  if (typeof win.matchMedia === 'function') {
    if (
      win.matchMedia('(display-mode: standalone)').matches ||
      win.matchMedia('(display-mode: window-controls-overlay)').matches ||
      win.matchMedia('(display-mode: minimal-ui)').matches
    ) {
      return true;
    }
  }
  return false;
}
