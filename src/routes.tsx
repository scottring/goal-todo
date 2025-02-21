import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AreasPage from './pages/AreasPage';
import AreaDetailsPage from './pages/AreaDetailsPage';
import GoalsPage from './pages/GoalsPage';
import TasksPage from './pages/TasksPage';
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

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<Layout><SignIn /></Layout>} />
        <Route path="/signup" element={<Layout><SignUp /></Layout>} />
        <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
        <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
        <Route path="/areas" element={<Layout><AreasPage /></Layout>} />
        <Route path="/areas/:areaId" element={<Layout><AreaDetailsPage /></Layout>} />
        <Route path="/goals" element={<Layout><GoalsPage /></Layout>} />
        <Route path="/goals/:goalId" element={<Layout><GoalDetailPage /></Layout>} />
        <Route path="/goals/:goalId/edit" element={<Layout><EditGoalPage /></Layout>} />
        <Route path="/tasks" element={<Layout><TasksPage /></Layout>} />
        <Route path="/weekly-planning" element={<Layout><WeeklyPlanningPage /></Layout>} />
        <Route path="/test" element={<Layout><TestWeeklyPlanning /></Layout>} />
        <Route path="/accept-invite" element={<Layout><AcceptInvitePage /></Layout>} />
        <Route path="/" element={<Layout><AreasPage /></Layout>} /> {/* Default route */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
