import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { RoutineSchedule, DayOfWeek } from '../types';
import { format } from 'date-fns';

interface RecurringTask {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: RoutineSchedule;
}

interface RecurringTaskSchedulerProps {
  tasks: RecurringTask[];
  onAddTask: (task: Omit<RecurringTask, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<RecurringTask>) => void;
  onDeleteTask: (taskId: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export const RecurringTaskScheduler: React.FC<RecurringTaskSchedulerProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [selectedTime, setSelectedTime] = useState<Date | null>(new Date());
  const [targetCount, setTargetCount] = useState(1);

  const handleAddTask = () => {
    if (newTaskTitle.trim() && selectedTime) {
      const schedule: RoutineSchedule = {
        type: frequency,
        targetCount,
        timeOfDay: {
          hour: selectedTime.getHours(),
          minute: selectedTime.getMinutes()
        }
      };

      if (frequency === 'weekly') {
        schedule.daysOfWeek = selectedDays.map(day => ({
          day,
          time: {
            hour: selectedTime.getHours(),
            minute: selectedTime.getMinutes()
          }
        }));
      }

      onAddTask({
        title: newTaskTitle.trim(),
        frequency,
        schedule
      });

      // Reset form
      setNewTaskTitle('');
      setFrequency('weekly');
      setSelectedDays([]);
      setSelectedTime(new Date());
      setTargetCount(1);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Schedule Recurring Tasks
          </Typography>

          <Stack spacing={3}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={4}>
                <TextField
                  label="Task Title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={frequency}
                    label="Frequency"
                    onChange={(e) => setFrequency(e.target.value as any)}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  type="number"
                  label="Target Count"
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value, 10))}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TimePicker
                  label="Time"
                  value={selectedTime}
                  onChange={(newValue) => setSelectedTime(newValue)}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || !selectedTime || (frequency === 'weekly' && selectedDays.length === 0)}
                  fullWidth
                >
                  Add Task
                </Button>
              </Grid>
            </Grid>

            {frequency === 'weekly' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Select Days:
                </Typography>
                <Stack direction="row" spacing={1}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Chip
                      key={day}
                      label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      onClick={() => toggleDay(day)}
                      color={selectedDays.includes(day) ? 'primary' : 'default'}
                      variant={selectedDays.includes(day) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <List>
              {tasks.map((task) => (
                <ListItem key={task.id} divider>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)} |{' '}
                          {task.schedule.type === 'weekly' && task.schedule.daysOfWeek && (
                            <>
                              {task.schedule.daysOfWeek.map(({ day }) => 
                                day.charAt(0).toUpperCase() + day.slice(1, 3)
                              ).join(', ')} at{' '}
                            </>
                          )}
                          {format(
                            new Date().setHours(
                              task.schedule.timeOfDay?.hour ?? 0,
                              task.schedule.timeOfDay?.minute ?? 0
                            ),
                            'h:mm a'
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => onDeleteTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}; 