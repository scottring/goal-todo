import React, { ErrorInfo, Component } from 'react';
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
import { Box, Typography, Button } from '@mui/material';
import theme from './theme';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>Something went wrong</Typography>
          <Typography paragraph>We're sorry, but there was an error loading the page.</Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log('App component rendering');
  
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
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
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
