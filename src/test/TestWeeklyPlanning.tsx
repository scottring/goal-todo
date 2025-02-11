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
  Alert
} from '@mui/material';

export const TestWeeklyPlanning: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetupTest = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { areaId, goalId } = await setupTestData(user.uid);
      setSuccess(true);

      // Navigate to weekly planning page after a short delay
      setTimeout(() => {
        navigate('/planning');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading || !user}
          sx={{ mt: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            'Setup Test Data'
          )}
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This will create:
          <ul>
            <li>A test area</li>
            <li>A test goal with 3 unscheduled tasks</li>
            <li>2 routines (daily and weekly)</li>
          </ul>
        </Typography>
      </Box>
    </Container>
  );
}; 