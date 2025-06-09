import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AreasPage from './pages/AreasPage';
import AreaDetailsPage from './pages/AreaDetailsPage';
import GoalsPage from './pages/GoalsPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import { WeeklyPlanningPage } from './pages/WeeklyPlanningPage';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import AdminPage from './pages/AdminPage';
import GoalDetailPage from './pages/GoalDetailPage';
import EditGoalPage from './pages/EditGoalPage';
import Layout from './components/Layout';
import { TestWeeklyPlanning } from './test/TestWeeklyPlanning';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { InboxPage } from './pages/InboxPage';
import { WeekPage } from './pages/WeekPage';
import AuthGuard from './components/auth/AuthGuard';

// Define public routes that don't require authentication
const publicRoutes = ['/signin', '/signup', '/forgot-password', '/accept-invite'];

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/signin" element={<Layout><SignIn /></Layout>} />
        <Route path="/signup" element={<Layout><SignUp /></Layout>} />
        <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
        <Route path="/accept-invite" element={<Layout><AcceptInvitePage /></Layout>} />

        {/* Protected Routes */}
        <Route path="/admin" element={<AuthGuard><Layout><AdminPage /></Layout></AuthGuard>} />
        <Route path="/inbox" element={<AuthGuard><Layout><InboxPage /></Layout></AuthGuard>} />
        <Route path="/week" element={<AuthGuard><Layout><WeekPage /></Layout></AuthGuard>} />
        <Route path="/areas" element={<AuthGuard><Layout><AreasPage /></Layout></AuthGuard>} />
        <Route path="/areas/:areaId" element={<AuthGuard><Layout><AreaDetailsPage /></Layout></AuthGuard>} />
        <Route path="/goals" element={<AuthGuard><Layout><GoalsPage /></Layout></AuthGuard>} />
        <Route path="/goals/:goalId" element={<AuthGuard><Layout><GoalDetailPage /></Layout></AuthGuard>} />
        <Route path="/goals/:goalId/edit" element={<AuthGuard><Layout><EditGoalPage /></Layout></AuthGuard>} />
        <Route path="/projects" element={<AuthGuard><Layout><ProjectsPage /></Layout></AuthGuard>} />
        <Route path="/tasks" element={<AuthGuard><Layout><TasksPage /></Layout></AuthGuard>} />
        <Route path="/tasks/:taskId" element={<AuthGuard><Layout><TaskDetailsPage /></Layout></AuthGuard>} />
        <Route path="/weekly-planning" element={<AuthGuard><Layout><WeeklyPlanningPage /></Layout></AuthGuard>} />
        <Route path="/test" element={<AuthGuard><Layout><TestWeeklyPlanning /></Layout></AuthGuard>} />
        
        {/* Default route */}
        <Route path="/" element={<AuthGuard><Layout><AreasPage /></Layout></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
