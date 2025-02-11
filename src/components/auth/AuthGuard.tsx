import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
  Container
} from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error, syncError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin', { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <Container>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Initializing...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error || syncError) {
    const errorMessage = error?.message || syncError?.message;
    return (
      <Container>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ maxWidth: 'sm' }}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              }
            >
              <Typography variant="subtitle2">Authentication Error</Typography>
              <Typography variant="body2">
                {errorMessage || 'An error occurred during authentication. Please try again.'}
              </Typography>
            </Alert>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}