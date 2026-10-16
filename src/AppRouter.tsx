import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LockGuard } from './components/security/LockGuard';

// 全頁面靜態直載 (Static Direct Import)，徹底消除白屏延遲，實現原生 App 級 0ms 秒開
import Dashboard from './pages/Dashboard';
import Diet from './pages/Diet';
import Workout from './pages/Workout';
import Body from './pages/Body';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <LockGuard>
        <AppLayout />
      </LockGuard>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'diet',
        element: <Diet />,
      },
      {
        path: 'workout',
        element: <Workout />,
      },
      {
        path: 'body',
        element: <Body />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'profile',
        element: <ProfileSettings />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
