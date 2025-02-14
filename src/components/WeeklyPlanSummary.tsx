import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Button
} from '@mui/material';
import { WeeklyPlanningSession } from '../types';
import { format } from 'date-fns';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { timestampToDate } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';
import { useGoalsContext } from '../contexts/GoalsContext';

interface WeeklyPlanSummaryProps {
  session: WeeklyPlanningSession;
  onSyncCalendar: () => Promise<void>;
}

export const WeeklyPlanSummary: React.FC<WeeklyPlanSummaryProps> = ({
  session,
  onSyncCalendar
}) => {
  const { goals } = useGoalsContext();
  const {
    reviewPhase,
    planningPhase,
    weekStartDate,
    weekEndDate
  } = session;

  // Find routine details from goals
  const routineDetails = useMemo(() => {
    const details: Record<string, { title: string; goalName: string }> = {};
    goals.forEach(goal => {
      goal.routines.forEach(routine => {
        if ('id' in routine) {
          details[routine.id] = {
            title: routine.title,
            goalName: goal.name
          };
        }
      });
    });
    return details;
  }, [goals]);

  // Calculate review statistics from taskReviews
  const reviewStats = useMemo(() => {
    const stats = {
      completed: 0,
      pushed: 0,
      missed: 0
    };

    reviewPhase.taskReviews.forEach(task => {
      if (task.action === 'mark_completed' || task.status === 'completed') {
        stats.completed++;
      } else if (task.action === 'push_forward') {
        stats.pushed++;
      } else if (task.action === 'mark_missed' || task.status === 'missed') {
        stats.missed++;
      }
    });

    return stats;
  }, [reviewPhase.taskReviews]);

  // Convert timestamps if they are Firebase timestamps
  const startDate = 'toDate' in weekStartDate ? fromFirebaseTimestamp(weekStartDate as any) : weekStartDate;
  const endDate = 'toDate' in weekEndDate ? fromFirebaseTimestamp(weekEndDate as any) : weekEndDate;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Weekly Plan Summary
        </Typography>

        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          {format(timestampToDate(startDate), 'MMM d')} - {format(timestampToDate(endDate), 'MMM d, yyyy')}
        </Typography>

        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Previous Week Review Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Tasks Completed"
                  secondary={reviewStats.completed}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tasks Pushed Forward"
                  secondary={reviewStats.pushed}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tasks Missed"
                  secondary={reviewStats.missed}
                />
              </ListItem>
            </List>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Next Week's Plan
            </Typography>
            <List dense>
              {planningPhase.nextWeekTasks.map((task) => {
                // Look up the task name from reviewPhase.taskReviews
                const taskDetails = reviewPhase.taskReviews.find(
                  review => review.taskId === task.taskId
                );
                const dueDate = 'toDate' in task.dueDate ? fromFirebaseTimestamp(task.dueDate as any) : task.dueDate;
                
                return (
                  <ListItem key={task.taskId}>
                    <ListItemText
                      primary={taskDetails?.title || 'Unknown Task'}
                      secondary={format(timestampToDate(dueDate), 'MMM d')}
                    />
                    <Chip
                      label={task.priority}
                      size="small"
                      color={
                        task.priority === 'high'
                          ? 'error'
                          : task.priority === 'medium'
                          ? 'warning'
                          : 'success'
                      }
                    />
                  </ListItem>
                );
              })}
              {planningPhase.nextWeekTasks.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No tasks scheduled for next week"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Habits and Routines
            </Typography>
            <List dense>
              {planningPhase.recurringTasks.map((task) => {
                const routineInfo = routineDetails[task.routineId];
                return (
                  <ListItem key={task.routineId}>
                    <ListItemText
                      primary={routineInfo?.title || 'Unknown Routine'}
                      secondary={
                        <>
                          {routineInfo?.goalName && (
                            <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block' }}>
                              {routineInfo.goalName}
                            </Typography>
                          )}
                          {`${task.frequency} | ${task.schedule.targetCount}x per ${task.frequency}`}
                        </>
                      }
                    />
                    {task.schedule.daysOfWeek?.[0]?.time && (
                      <Chip
                        label={`${String(task.schedule.daysOfWeek[0].time.hour).padStart(2, '0')}:${String(task.schedule.daysOfWeek[0].time.minute).padStart(2, '0')}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </ListItem>
                );
              })}
              {planningPhase.recurringTasks.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No habits or routines scheduled"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Calendar Sync Status
            </Typography>
            {planningPhase.calendarSyncStatus.synced ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label="Synced"
                  color="success"
                  size="small"
                />
                <Typography variant="body2" color="textSecondary">
                  Last synced: {planningPhase.calendarSyncStatus.lastSyncedAt && format(
                    timestampToDate(
                      'toDate' in planningPhase.calendarSyncStatus.lastSyncedAt 
                        ? fromFirebaseTimestamp(planningPhase.calendarSyncStatus.lastSyncedAt as any)
                        : planningPhase.calendarSyncStatus.lastSyncedAt
                    ),
                    'MMM d, h:mm a'
                  )}
                </Typography>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<CalendarTodayIcon />}
                onClick={onSyncCalendar}
              >
                Sync with Calendar
              </Button>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Next Steps
            </Typography>
            <Typography variant="body2" component="div">
              <ul>
                <li>Review your calendar for any conflicts</li>
                <li>Set up notifications for high-priority tasks</li>
                <li>Share updates with team members on shared goals</li>
                <li>Schedule your next weekly review session</li>
              </ul>
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}; 