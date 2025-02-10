import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TodosPage from './pages/TodosPage';
import AreasPage from './pages/AreasPage';
import AreaDetailsPage from './pages/AreaDetailsPage';
import GoalsPage from './pages/GoalsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import { AreasProvider } from './contexts/AreasContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { SharedGoalsProvider } from './contexts/SharedGoalsContext';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

function App() {
  return (
    <AuthProvider>
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
                          <Route path="/" element={<TodosPage />} />
                          <Route path="/areas" element={<AreasPage />} />
                          <Route path="/areas/:areaId" element={<AreaDetailsPage />} />
                          <Route path="/goals" element={<GoalsPage />} />
                          <Route path="/goals/:goalId" element={<GoalDetailPage />} />
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
    </AuthProvider>
  );
}

export default App;