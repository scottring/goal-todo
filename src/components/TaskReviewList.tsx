import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { TaskReviewItem } from '../types';
import { format } from 'date-fns';

interface TaskReviewListProps {
  tasks: TaskReviewItem[];
  onTaskAction: (taskId: string, action: string) => void;
}

export const TaskReviewList: React.FC<TaskReviewListProps> = ({ tasks, onTaskAction }) => {
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
    const actions = [
      { label: 'Mark Complete', value: 'mark_completed' },
      { label: 'Push Forward', value: 'push_forward' },
      { label: 'Mark Missed', value: 'mark_missed' },
      { label: 'Archive', value: 'archive' }
    ];

    return (
      <ButtonGroup size="small" variant="outlined">
        {actions.map((action) => (
          <Button
            key={action.value}
            onClick={() => onTaskAction(task.taskId, action.value)}
            disabled={task.action === action.value}
          >
            {action.label}
          </Button>
        ))}
      </ButtonGroup>
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
      {tasks.map((task) => (
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
                  Due: {format(task.originalDueDate.toDate(), 'MMM d, yyyy')}
                </Typography>
                {task.completedDate && (
                  <Typography variant="body2" color="textSecondary">
                    Completed: {format(task.completedDate.toDate(), 'MMM d, yyyy')}
                  </Typography>
                )}
              </Box>
              {task.action && (
                <Chip
                  label={`Action: ${task.action.replace('_', ' ')}`}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderTaskActions(task)}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}; 