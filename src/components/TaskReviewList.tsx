import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Divider,
  CircularProgress
} from '@mui/material';
import { TaskReviewItem } from '../types';
import { format } from 'date-fns';
import { timestampToDate } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';

// Updated interface to include onTaskAction prop with specific action types
interface TaskReviewListProps {
  tasks: TaskReviewItem[];
  onTaskAction: (taskId: string, action: 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close') => Promise<void>;
}

export const TaskReviewList = ({ tasks, onTaskAction }: TaskReviewListProps) => {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const handleAction = async (task: TaskReviewItem, action: 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close') => {
    try {
      setLoadingTaskId(task.taskId);
      // Ensure we pass all required fields, including priority
      await onTaskAction(task.taskId, action);
    } catch (error) {
      console.error('Error updating task:', error);
      // Optionally add notifications here
    } finally {
      setLoadingTaskId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'missed':
        return 'error';
      case 'partial':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderTaskActions = (task: TaskReviewItem) => {
    const isLoading = loadingTaskId === task.taskId;
    const buttonStyle = { margin: '0 4px' };

    if (task.action) {
      return (
        <Typography color="textSecondary">
          {task.action === 'mark_completed' && 'Marked as completed'}
          {task.action === 'mark_missed' && 'Marked as missed'}
          {task.action === 'push_forward' && 'Pushed forward'}
          {task.action === 'archive' && 'Archived'}
        </Typography>
      );
    }

    return (
      <Box>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              size="small"
              style={buttonStyle}
              onClick={() => handleAction(task, 'mark_completed')}
            >
              Complete
            </Button>
            <Button
              variant="contained"
              color="warning"
              size="small"
              style={buttonStyle}
              onClick={() => handleAction(task, 'push_forward')}
            >
              Push Forward
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              style={buttonStyle}
              onClick={() => handleAction(task, 'mark_missed')}
            >
              Mark Missed
            </Button>
          </>
        )}
      </Box>
    );
  };

  if (tasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="textSecondary">
          No tasks to review for this week.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {tasks.map((task) => {
        // Convert Firebase Timestamp to our custom Timestamp if needed
        const originalDueDate = 'toDate' in task.originalDueDate ? fromFirebaseTimestamp(task.originalDueDate as any) : task.originalDueDate;
        const completedDate = task.completedDate && 'toDate' in task.completedDate ? fromFirebaseTimestamp(task.completedDate as any) : task.completedDate;

        return (
          <Card key={task.taskId} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {task.title}
                  </Typography>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Due: {format(timestampToDate(originalDueDate), 'MMM d, yyyy')}
                  </Typography>
                  {completedDate && (
                    <Typography variant="body2" color="textSecondary">
                      Completed: {format(timestampToDate(completedDate), 'MMM d, yyyy')}
                    </Typography>
                  )}
                </Box>
                {renderTaskActions(task)}
              </Box>
              <Divider sx={{ my: 2 }} />
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}; 