import React, { ErrorInfo, Component, useEffect } from 'react';
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
import { Box, Typography, Button, GlobalStyles } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import theme from './theme';

// Add global styles
const globalStyles = (
  <GlobalStyles
    styles={{
      '@import': "url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')",
      'html, body': {
        margin: 0,
        padding: 0,
        height: '100%',
        width: '100%',
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      '*': {
        boxSizing: 'border-box',
      },
      a: {
        textDecoration: 'none',
      },
    }}
  />
);

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
        {globalStyles}
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <FirestoreProvider>
              <AreasProvider>
                <GoalsProvider>
                  <SharedGoalsProvider>
                    <WeeklyPlanningProvider>
                      <AppRoutes />
                      <Toaster 
                        position="top-right"
                        toastOptions={{
                          style: {
                            background: '#fff',
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            padding: '12px 16px',
                            fontSize: '14px',
                          },
                          success: {
                            iconTheme: {
                              primary: theme.palette.success.main,
                              secondary: '#fff',
                            },
                          },
                          error: {
                            iconTheme: {
                              primary: theme.palette.error.main,
                              secondary: '#fff',
                            },
                          },
                        }}
                      />
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
