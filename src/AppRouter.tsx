import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LockGuard } from './components/security/LockGuard';

// 全頁面靜態直載 (Static Direct Import)，徹底消除白屏延遲，實現原生 App 級 0ms 秒開
import Dashboard from './pages/Dashboard';
import Diet from './pages/Diet';
import Workout from './pages/Workout';
import Body from './pages/Body';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import Categories from './pages/Categories';
import RecipeDetails from './pages/RecipeDetails';
import CategoryDetails from './pages/CategoryDetails';
import Exercises from './pages/Exercises';
import ExerciseDetails from './pages/ExerciseDetails';
import Routines from './pages/Routines';
import RoutineDetails from './pages/RoutineDetails';
import Equipments from './pages/Equipments';

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
        path: 'settings/foods',
        element: <Categories />,
      },
      {
        path: 'settings/foods/archived',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/foods/:id',
        element: <CategoryDetails />,
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
        element: <RecipeDetails />,
      },
      {
        path: 'settings/exercises',
        element: <Exercises />,
      },
      {
        path: 'settings/exercises/archived',
        element: <Navigate to="/settings/exercises" replace />,
      },
      {
        path: 'settings/exercises/:id',
        element: <ExerciseDetails />,
      },
      {
        path: 'settings/routines',
        element: <Routines />,
      },
      {
        path: 'settings/routines/archived',
        element: <Navigate to="/settings/routines" replace />,
      },
      {
        path: 'settings/routines/:id',
        element: <RoutineDetails />,
      },
      {
        path: 'settings/equipments',
        element: <Equipments />,
      },
      {
        path: 'settings/equipments/archived',
        element: <Navigate to="/settings/equipments" replace />,
      },
      {
        path: 'settings/categories',
        element: <Categories />,
      },
      {
        path: 'settings/categories/archived',
        element: <Navigate to="/settings/foods" replace />,
      },
      {
        path: 'settings/categories/:id',
        element: <CategoryDetails />,
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
