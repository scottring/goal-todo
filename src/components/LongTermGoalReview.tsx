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
  IconButton,
  Alert,
  Collapse,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Timestamp } from 'firebase/firestore';
import { addDays, nextSunday, previousSunday, isSunday, isAfter, isBefore, startOfDay } from 'date-fns';

interface LongTermGoalReviewProps {
  goalId: string;
  goalName: string;
  description: string;
  lastReviewDate?: Timestamp;
  nextReviewDate?: Timestamp;
  onUpdateReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => void;
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
  const [reviewDate, setReviewDate] = useState<Date | null>(initialReviewDate);

  const handleSave = async () => {
    if (reviewDate) {
      try {
        // Always normalize the review date to the appropriate Sunday
        const normalizedReviewDate = getNextReviewDate(reviewDate);
        await onUpdateReview(goalId, madeProgress, adjustments, normalizedReviewDate);
        setSavedReview({
          madeProgress,
          adjustments,
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

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Not set';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    } else if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    } else {
      try {
        return new Date(timestamp).toLocaleDateString();
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {goalName}
              </Typography>
              {hasBeenReviewed && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Reviewed"
                  color="success"
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
            </Box>
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

          <Collapse in={showSuccess}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Review saved successfully!
            </Alert>
          </Collapse>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Last Review: {formatDate(lastReviewDate)}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Next Review: {formatDate(nextReviewDate)}
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
                  onChange={(newValue: Date | null) => {
                    if (newValue) {
                      // Automatically adjust to appropriate Sunday when date is changed
                      setReviewDate(getNextReviewDate(newValue));
                    } else {
                      setReviewDate(null);
                    }
                  }}
                  sx={{ width: '100%' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Note: Review dates are automatically adjusted to the nearest appropriate Sunday
                </Typography>

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
              <>
                {savedReview ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Latest Review
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        Progress: {savedReview.madeProgress ? 'Yes' : 'No'}
                      </Typography>
                      {savedReview.adjustments && (
                        <Typography variant="body2">
                          Adjustments: {savedReview.adjustments}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        Next Review: {savedReview.nextReviewDate?.toLocaleDateString()}
                      </Typography>
                    </Stack>
                    <Button
                      variant="outlined"
                      onClick={() => setIsEditing(true)}
                      startIcon={<EditIcon />}
                      sx={{ mt: 2 }}
                    >
                      Update Review
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(true)}
                    startIcon={<EditIcon />}
                  >
                    Start Review
                  </Button>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}; 