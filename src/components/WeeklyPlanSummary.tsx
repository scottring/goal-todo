import React from 'react';
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

interface WeeklyPlanSummaryProps {
  session: WeeklyPlanningSession;
  onSyncCalendar: () => Promise<void>;
}

export const WeeklyPlanSummary: React.FC<WeeklyPlanSummaryProps> = ({
  session,
  onSyncCalendar
}) => {
  const {
    reviewPhase,
    planningPhase,
    weekStartDate,
    weekEndDate
  } = session;

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
              Review Phase Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Tasks Completed"
                  secondary={reviewPhase.summary.totalCompleted}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tasks Pushed Forward"
                  secondary={reviewPhase.summary.totalPushedForward}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tasks Missed"
                  secondary={reviewPhase.summary.totalMissed}
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
                const dueDate = 'toDate' in task.dueDate ? fromFirebaseTimestamp(task.dueDate as any) : task.dueDate;
                return (
                  <ListItem key={task.taskId}>
                    <ListItemText
                      primary={task.taskId}
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
            </List>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Recurring Tasks
            </Typography>
            <List dense>
              {planningPhase.recurringTasks.map((task) => (
                <ListItem key={task.routineId}>
                  <ListItemText
                    primary={task.routineId}
                    secondary={`${task.frequency} | ${task.schedule.targetCount}x`}
                  />
                </ListItem>
              ))}
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