import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LockGuard } from './components/security/LockGuard';
import { SetupGuard } from './components/security/SetupGuard';

// 全頁面靜態直載 (Static Direct Import)，徹底消除白屏延遲，實現原生 App 級 0ms 秒開
import Dashboard from './pages/Dashboard';
import Diet from './pages/Diet';
import Workout from './pages/Workout';
import Body from './pages/Body';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import FoodsPage from './pages/FoodsPage';
import ExercisesPage from './pages/ExercisesPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <LockGuard>
        <SetupGuard>
          <AppLayout />
        </SetupGuard>
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
        path: 'settings/foods',
        element: <FoodsPage />,
      },
      {
        path: 'settings/foods/archived',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/foods/:id',
        element: <FoodsPage />,
      },
      {
        path: 'settings/recipes',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/recipes/archived',
        element: <Navigate to="/settings/recipes" replace />,
      },
      {
        path: 'settings/recipes/:id',
        element: <FoodsPage />,
      },
      {
        path: 'settings/exercises',
        element: <ExercisesPage />,
      },
      {
        path: 'settings/exercises/archived',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/exercises/:id',
        element: <ExercisesPage />,
      },
      {
        path: 'settings/workouts',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/routines',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/routines/archived',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/routines/:id',
        element: <ExercisesPage />,
      },
      {
        path: 'settings/equipments',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/equipments/archived',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/categories',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/categories/archived',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/categories/:id',
        element: <FoodsPage />,
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
