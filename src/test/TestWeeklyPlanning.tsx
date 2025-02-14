import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setupTestData } from './setupTestData';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

export const TestWeeklyPlanning: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('TestWeeklyPlanning mounted', { currentUser, authLoading });
    if (!authLoading && !currentUser) {
      console.log('Redirecting to signin');
      navigate('/signin');
    }
  }, [currentUser, authLoading, navigate]);

  const handleSetupTest = async () => {
    if (!currentUser) {
      setError('Please sign in to continue');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      console.log('Setting up test data for user:', currentUser.uid);

      await setupTestData(currentUser.uid);
      setSuccess(true);
      console.log('Test data setup complete');

      // Navigate to weekly planning page after a short delay
      setTimeout(() => {
        navigate('/weekly-planning');
      }, 1500);
    } catch (err) {
      console.error('Error setting up test data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    console.log('Auth loading...');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('Rendering test content', { currentUser, error, success, loading });

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Weekly Planning Test
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Test data created successfully! Redirecting to weekly planning...
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleSetupTest}
          disabled={loading || !currentUser}
          sx={{ mt: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            'Setup Test Data'
          )}
        </Button>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This will create:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="A test area" />
            </ListItem>
            <ListItem>
              <ListItemText primary="A test goal with 3 unscheduled tasks" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2 routines (daily and weekly)" />
            </ListItem>
          </List>
        </Box>
      </Box>
    </Container>
  );
}; 