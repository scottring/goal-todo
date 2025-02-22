import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { clearDevData, repopulateDevData } from '../utils/dev-data-utils';
import toast from 'react-hot-toast';

export const DevDataManager: React.FC = () => {
  const { currentUser } = useAuth();

  const handleClearData = async () => {
    if (!currentUser) return;
    
    try {
      await clearDevData(currentUser.uid);
      toast.success('Development data cleared successfully');
    } catch (error) {
      console.error('Error clearing development data:', error);
      toast.error('Failed to clear development data');
    }
  };

  const handleRepopulateData = async () => {
    if (!currentUser) return;
    
    try {
      await repopulateDevData(currentUser.uid);
      toast.success('Development data repopulated successfully');
    } catch (error) {
      console.error('Error repopulating development data:', error);
      toast.error('Failed to repopulate development data');
    }
  };

  // Only show in development environment
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ p: 2, border: '1px dashed grey', borderRadius: 1, my: 2 }}>
      <Typography variant="h6" color="text.secondary">
        Development Data Manager
      </Typography>
      
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleClearData}
          disabled={!currentUser}
        >
          Clear Test Data
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleRepopulateData}
          disabled={!currentUser}
        >
          Repopulate Test Data
        </Button>
      </Stack>
    </Stack>
  );
}; 