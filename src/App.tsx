import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TasksPage from './pages/TasksPage';
import AreasPage from './pages/AreasPage';
import AreaDetailsPage from './pages/AreaDetailsPage';
import GoalsPage from './pages/GoalsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import { WeeklyPlanningPage } from './pages/WeeklyPlanningPage';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import AdminPage from './pages/AdminPage';
import { AreasProvider } from './contexts/AreasContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { SharedGoalsProvider } from './contexts/SharedGoalsContext';
import { WeeklyPlanningProvider } from './contexts/WeeklyPlanningContext';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import AuthGuard from './components/auth/AuthGuard';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CssBaseline from '@mui/material/CssBaseline';
import { TestWeeklyPlanning } from './test/TestWeeklyPlanning';
import { StrictMode } from 'react';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <FirestoreProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/test/weekly-planning" element={<TestWeeklyPlanning />} />
                  <Route
                    path="/*"
                    element={
                      <AuthGuard>
                        <AreasProvider>
                          <GoalsProvider>
                            <SharedGoalsProvider>
                              <WeeklyPlanningProvider>
                                <Layout>
                                  <Routes>
                                    <Route path="/" element={<TasksPage />} />
                                    <Route path="/areas" element={<AreasPage />} />
                                    <Route path="/areas/:areaId" element={<AreaDetailsPage />} />
                                    <Route path="/goals" element={<GoalsPage />} />
                                    <Route path="/goals/:goalId" element={<GoalDetailPage />} />
                                    <Route path="/planning" element={<WeeklyPlanningPage />} />
                                    <Route path="/admin" element={<AdminPage />} />
                                  </Routes>
                                </Layout>
                              </WeeklyPlanningProvider>
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
        </LocalizationProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

export default App;