import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { Timestamp } from 'firebase/firestore';

interface LongTermGoalReviewProps {
  goalId: string;
  goalName: string;
  description: string;
  lastReviewDate: Timestamp;
  nextReviewDate: Timestamp;
  onUpdateReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => void;
}

export const LongTermGoalReview: React.FC<LongTermGoalReviewProps> = ({
  goalId,
  goalName,
  description,
  lastReviewDate,
  nextReviewDate,
  onUpdateReview
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [madeProgress, setMadeProgress] = useState(false);
  const [adjustments, setAdjustments] = useState('');
  const [reviewDate, setReviewDate] = useState<Date | null>(nextReviewDate.toDate());

  const handleSave = () => {
    if (reviewDate) {
      onUpdateReview(goalId, madeProgress, adjustments, reviewDate);
    }
    setIsEditing(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {goalName}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setIsEditing(!isEditing)}
              color={isEditing ? 'primary' : 'default'}
            >
              {isEditing ? <SaveIcon /> : <EditIcon />}
            </IconButton>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            {description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Last Review: {lastReviewDate.toDate().toLocaleDateString()}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Next Review: {nextReviewDate.toDate().toLocaleDateString()}
              </Typography>
            </Box>

            {isEditing ? (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={madeProgress}
                      onChange={(e) => setMadeProgress(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Made meaningful progress this week?"
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Adjustments or Notes"
                  value={adjustments}
                  onChange={(e) => setAdjustments(e.target.value)}
                  variant="outlined"
                />

                <DatePicker
                  label="Next Review Date"
                  value={reviewDate}
                  onChange={(newValue: Date | null) => setReviewDate(newValue)}
                  sx={{ width: '100%' }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                  >
                    Save Review
                  </Button>
                </Box>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setIsEditing(true)}
                startIcon={<EditIcon />}
              >
                Start Review
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}; 