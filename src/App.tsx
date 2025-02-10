import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TasksPage from './pages/TasksPage';
import AreasPage from './pages/AreasPage';
import AreaDetailsPage from './pages/AreaDetailsPage';
import GoalsPage from './pages/GoalsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import WeeklyPlanning from './components/planning/WeeklyPlanning';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import { AreasProvider } from './contexts/AreasContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { SharedGoalsProvider } from './contexts/SharedGoalsContext';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import AuthGuard from './components/auth/AuthGuard';

function App() {
  return (
    <AuthProvider>
      <FirestoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <AreasProvider>
                    <GoalsProvider>
                      <SharedGoalsProvider>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<TasksPage />} />
                            <Route path="/areas" element={<AreasPage />} />
                            <Route path="/areas/:areaId" element={<AreaDetailsPage />} />
                            <Route path="/goals" element={<GoalsPage />} />
                            <Route path="/goals/:goalId" element={<GoalDetailPage />} />
                            <Route path="/planning" element={<WeeklyPlanning />} />
                          </Routes>
                        </Layout>
                      </SharedGoalsProvider>
                    </GoalsProvider>
                  </AreasProvider>
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </FirestoreProvider>
    </AuthProvider>
  );
}

export default App;