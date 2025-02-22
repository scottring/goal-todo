import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { currentUser, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/signin', { 
        replace: true,
        state: { from: location.pathname + location.search }
      });
    }
  }, [currentUser, loading, navigate, location]);

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
              Checking authentication...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
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
                {error.message || 'An error occurred during authentication. Please try again.'}
              </Typography>
            </Alert>
          </Box>
        </Box>
      </Container>
    );
  }

  return currentUser ? <>{children}</> : null;
};

export default AuthGuard;