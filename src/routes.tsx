import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import SignIn from './components/auth/SignIn';
import Layout from './components/Layout';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import AreasPage from './pages/AreasPage';
import { WeeklyPlanningPage } from './pages/WeeklyPlanningPage';
import { TestWeeklyPlanning } from './test/TestWeeklyPlanning';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/signin" />;
  }

  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route 
        path="/test/weekly-planning" 
        element={
          <PrivateRoute>
            <TestWeeklyPlanning />
          </PrivateRoute>
        } 
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<TasksPage />} />
                <Route path="/areas" element={<AreasPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/planning" element={<WeeklyPlanningPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
} 