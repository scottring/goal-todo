import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { AreasProvider } from './contexts/AreasContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { SharedGoalsProvider } from './contexts/SharedGoalsContext';
import { WeeklyPlanningProvider } from './contexts/WeeklyPlanningContext';
import AppRoutes from './routes';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <AuthProvider>
            <FirestoreProvider>
              <AreasProvider>
                <GoalsProvider>
                  <SharedGoalsProvider>
                    <WeeklyPlanningProvider>
                      <AppRoutes />
                    </WeeklyPlanningProvider>
                  </SharedGoalsProvider>
                </GoalsProvider>
              </AreasProvider>
            </FirestoreProvider>
          </AuthProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;