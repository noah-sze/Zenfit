import { useCallback, useSyncExternalStore } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isStandaloneDisplayMode } from '@/utils/pwaPlatform';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unsupported';

interface PwaInstallSnapshot {
  canNativePrompt: boolean;
  isStandalone: boolean;
  isInstalledInSession: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isStandaloneState = isStandaloneDisplayMode();
let isInstalledInSessionState = false;
let isInitialized = false;

let cachedSnapshot: PwaInstallSnapshot = {
  canNativePrompt: false,
  isStandalone: isStandaloneState,
  isInstalledInSession: false,
};

const listeners = new Set<() => void>();

function notifyListeners(): void {
  cachedSnapshot = {
    canNativePrompt: deferredPrompt !== null,
    isStandalone: isStandaloneState,
    isInstalledInSession: isInstalledInSessionState,
  };
  listeners.forEach((listener) => listener());
}

/**
 * 在應用啟動第 0 幀即掛載全域 PWA 事件監聽，確保不錯過任何瀏覽器的 beforeinstallprompt 事件
 */
export function initPwaInstallListener(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  isStandaloneState = isStandaloneDisplayMode(window);
  notifyListeners();

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstalledInSessionState = true;
    notifyListeners();
  });

  if (typeof window.matchMedia === 'function') {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      const nextStandalone = isStandaloneDisplayMode(window);
      if (nextStandalone !== isStandaloneState) {
        isStandaloneState = nextStandalone;
        if (nextStandalone) {
          deferredPrompt = null;
        }
        notifyListeners();
      }
    };

    if (typeof standaloneMedia.addEventListener === 'function') {
      standaloneMedia.addEventListener('change', handleDisplayModeChange);
    } else if (typeof standaloneMedia.addListener === 'function') {
      standaloneMedia.addListener(handleDisplayModeChange);
    }
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PwaInstallSnapshot {
  return cachedSnapshot;
}

export function usePwaInstall() {
  initPwaInstallListener();

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const hidePwaInstallPrompt = useAppStore((s) => s.hidePwaInstallPrompt);
  const setHidePwaInstallPrompt = useAppStore((s) => s.setHidePwaInstallPrompt);

  const isInstalled = snapshot.isStandalone || snapshot.isInstalledInSession;
  const showInstallButton = !isInstalled && !hidePwaInstallPrompt;
  const showSettingsToggle = !isInstalled;

  const triggerInstall = useCallback(async (): Promise<PwaInstallOutcome> => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) {
      return 'unsupported';
    }

    // Chromium 規定單次 BeforeInstallPromptEvent 僅可呼叫一次 prompt()
    deferredPrompt = null;
    notifyListeners();

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        isInstalledInSessionState = true;
        notifyListeners();
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      return 'unsupported';
    }
  }, []);

  return {
    isStandalone: snapshot.isStandalone,
    isInstalled,
    canNativePrompt: snapshot.canNativePrompt,
    hidePwaInstallPrompt,
    setHidePwaInstallPrompt,
    showInstallButton,
    showSettingsToggle,
    triggerInstall,
  };
}
