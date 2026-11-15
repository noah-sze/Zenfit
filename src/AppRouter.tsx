import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LockGuard } from './components/security/LockGuard';
import { SetupGuard } from './components/security/SetupGuard';
import LandingPage from './pages/LandingPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/landing',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/app',
    element: (
      <LockGuard>
        <SetupGuard>
          <AppLayout />
        </SetupGuard>
      </LockGuard>
    ),
  },
  // 任何 App 子路徑一律自動正規化回 /app，始終維持單一 URL
  {
    path: '/app/*',
    element: <Navigate to="/app" replace />,
  },
  // 舊頂層路徑向後相容重定向至 /app
  {
    path: '/diet',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/workout',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/body',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/settings',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/settings/*',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/profile',
    element: <Navigate to="/app" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
