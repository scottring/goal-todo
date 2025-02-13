import React, { useState } from 'react';
import { Timestamp } from '../types';
import { timestampToDate } from '../utils/date';
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
  IconButton,
  Alert,
  Collapse,
  Chip,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { addDays, nextSunday, previousSunday, isSunday, isAfter, isBefore, startOfDay } from 'date-fns';

interface LongTermGoalReviewProps {
  goalId: string;
  goalName: string;
  description?: string;
  lastReviewDate?: Timestamp;
  nextReviewDate?: Timestamp;
  onUpdateReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
}

const getNextReviewDate = (currentDate: Date = new Date()): Date => {
  const today = startOfDay(currentDate);
  const nextSundayDate = nextSunday(today);
  const prevSundayDate = previousSunday(today);
  
  // If today is Sunday, return next Sunday
  if (isSunday(today)) {
    return nextSundayDate;
  }
  
  // If we're within 3 days after the previous Sunday
  const threeDaysAfterPrevSunday = addDays(prevSundayDate, 3);
  if (isBefore(today, threeDaysAfterPrevSunday)) {
    return prevSundayDate;
  }
  
  // If we're within 3 days before next Sunday
  const threeDaysBeforeNextSunday = addDays(nextSundayDate, -3);
  if (isAfter(today, threeDaysBeforeNextSunday)) {
    return nextSundayDate;
  }
  
  // Otherwise, return next Sunday
  return nextSundayDate;
};

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);
  const [savedReview, setSavedReview] = useState<{
    madeProgress: boolean;
    adjustments?: string;
    nextReviewDate?: Date;
  } | null>(null);
  
  // Initialize reviewDate safely handling non-Timestamp values
  const initialReviewDate = (() => {
    if (nextReviewDate) {
      if ('toDate' in nextReviewDate && typeof nextReviewDate.toDate === 'function') {
        return getNextReviewDate(nextReviewDate.toDate());
      } else if (nextReviewDate instanceof Date) {
        return getNextReviewDate(nextReviewDate);
      } else {
        return getNextReviewDate(new Date(nextReviewDate));
      }
    } else {
      return getNextReviewDate();
    }
  })();
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    nextReviewDate ? timestampToDate(nextReviewDate) : null
  );

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Not set';
    return timestampToDate(timestamp).toLocaleDateString();
  };

  const handleSubmit = async () => {
    if (selectedDate) {
      try {
        // Always normalize the review date to the appropriate Sunday
        const normalizedReviewDate = getNextReviewDate(selectedDate);
        
        // Create review data with only defined values
        const reviewData = {
          goalId,
          madeProgress,
          ...(adjustments && { adjustments }), // Only include if adjustments exists
          nextReviewDate: normalizedReviewDate
        };
        
        await onUpdateReview(goalId, madeProgress, adjustments || '', normalizedReviewDate);
        setSavedReview({
          madeProgress,
          ...(adjustments && { adjustments }),
          nextReviewDate: normalizedReviewDate
        });
        setHasBeenReviewed(true);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Error saving review:', error);
      }
    }
    setIsEditing(false);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {goalName}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>

        <Box>
          {lastReviewDate && (
            <Typography variant="body2" color="text.secondary">
              Last reviewed: {formatDate(lastReviewDate)}
            </Typography>
          )}
          {nextReviewDate && (
            <Typography variant="body2" color="text.secondary">
              Next review: {formatDate(nextReviewDate)}
            </Typography>
          )}
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={madeProgress}
              onChange={(e) => setMadeProgress(e.target.checked)}
            />
          }
          label="Made progress since last review"
        />

        <TextField
          label="Adjustments or Notes"
          multiline
          rows={3}
          value={adjustments}
          onChange={(e) => setAdjustments(e.target.value)}
          fullWidth
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Next Review Date"
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: 'When would you like to review this goal again?'
              }
            }}
          />
        </LocalizationProvider>

        <Button variant="contained" onClick={handleSubmit}>
          Save Review
        </Button>
      </Stack>
    </Paper>
  );
}; 