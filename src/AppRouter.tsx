import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Router,
  NavigationType,
  parsePath,
  type Location,
  type Navigator,
  type To,
} from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { SetupGuard } from './components/security/SetupGuard';
import {
  APP_ROUTES,
  resolveInitialLogicalPath,
  toSingleBrowserUrl,
} from '@/utils/navigation';

const LandingPage = lazy(() => import('./pages/LandingPage'));

interface SingleUrlHistoryState {
  __e2cal: true;
  pathname: string;
  key: string;
  idx: number;
  usr?: unknown;
}

function isSingleUrlState(state: unknown): state is SingleUrlHistoryState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Partial<SingleUrlHistoryState>).__e2cal === true &&
    typeof (state as Partial<SingleUrlHistoryState>).pathname === 'string' &&
    typeof (state as Partial<SingleUrlHistoryState>).key === 'string' &&
    typeof (state as Partial<SingleUrlHistoryState>).idx === 'number'
  );
}

function createLocationKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function resolveToPathname(to: To): string {
  if (typeof to === 'string') {
    return parsePath(to).pathname || APP_ROUTES.home;
  }
  return to.pathname || APP_ROUTES.home;
}

function toRouterLocation(state: SingleUrlHistoryState): Location {
  return {
    pathname: state.pathname,
    search: '',
    hash: '',
    state: state.usr ?? null,
    key: state.key,
  };
}

function readInitialHistoryState(): SingleUrlHistoryState {
  if (typeof window === 'undefined') {
    return { __e2cal: true, pathname: APP_ROUTES.home, key: 'default', idx: 0 };
  }

  const rawState = window.history.state;
  if (isSingleUrlState(rawState)) {
    const normalizedPath = resolveInitialLogicalPath(rawState.pathname);
    const browserUrl = toSingleBrowserUrl(normalizedPath);
    const nextState: SingleUrlHistoryState = { ...rawState, pathname: normalizedPath };
    if (window.location.pathname !== browserUrl || rawState.pathname !== normalizedPath) {
      window.history.replaceState(nextState, '', browserUrl);
    }
    return nextState;
  }

  const initialPath = resolveInitialLogicalPath(window.location.pathname);
  const initialState: SingleUrlHistoryState = {
    __e2cal: true,
    pathname: initialPath,
    key: createLocationKey(),
    idx: 0,
  };
  window.history.replaceState(initialState, '', toSingleBrowserUrl(initialPath));
  return initialState;
}

/**
 * 單一 URL (/app) 標準 React Router 適配器
 * - 路由狀態與返回歷史 100% 以瀏覽器原生 window.history.state 為唯一真理源（零 Zustand 雙份棧、零回聲計數器）
 * - App 內所有子視圖網址列一律鎖定為 /app，同時完整支援瀏覽器前進/後退鍵、手機側滑返回與 navigate(-1)
 */
export function AppRouter() {
  const [navState, setNavState] = useState<{
    action: NavigationType;
    historyState: SingleUrlHistoryState;
  }>(() => ({
    action: NavigationType.Pop,
    historyState: readInitialHistoryState(),
  }));

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isSingleUrlState(event.state)) {
        setNavState({
          action: NavigationType.Pop,
          historyState: event.state,
        });
        return;
      }

      const fallbackPath = resolveInitialLogicalPath(window.location.pathname);
      const fallbackState: SingleUrlHistoryState = {
        __e2cal: true,
        pathname: fallbackPath,
        key: createLocationKey(),
        idx: 0,
      };
      setNavState({
        action: NavigationType.Pop,
        historyState: fallbackState,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigator = useMemo<Navigator>(
    () => ({
      createHref: (to) => toSingleBrowserUrl(resolveToPathname(to)),
      push: (to, usr) => {
        const nextPath = resolveInitialLogicalPath(resolveToPathname(to));
        const currentIdx = isSingleUrlState(window.history.state)
          ? window.history.state.idx
          : 0;
        const nextState: SingleUrlHistoryState = {
          __e2cal: true,
          pathname: nextPath,
          key: createLocationKey(),
          idx: currentIdx + 1,
          usr,
        };
        window.history.pushState(nextState, '', toSingleBrowserUrl(nextPath));
        setNavState({ action: NavigationType.Push, historyState: nextState });
      },
      replace: (to, usr) => {
        const nextPath = resolveInitialLogicalPath(resolveToPathname(to));
        const currentIdx = isSingleUrlState(window.history.state)
          ? window.history.state.idx
          : 0;
        const nextState: SingleUrlHistoryState = {
          __e2cal: true,
          pathname: nextPath,
          key: createLocationKey(),
          idx: currentIdx,
          usr,
        };
        window.history.replaceState(nextState, '', toSingleBrowserUrl(nextPath));
        setNavState({ action: NavigationType.Replace, historyState: nextState });
      },
      go: (delta) => {
        window.history.go(delta);
      },
    }),
    []
  );

  const location = useMemo(
    () => toRouterLocation(navState.historyState),
    [navState.historyState]
  );

  const isLanding = location.pathname === '/';

  return (
    <Router location={location} navigationType={navState.action} navigator={navigator}>
      {isLanding ? (
        <Suspense fallback={<div className="min-h-full bg-background" />}>
          <LandingPage />
        </Suspense>
      ) : (
        <SetupGuard>
          <AppLayout />
        </SetupGuard>
      )}
    </Router>
  );
}
