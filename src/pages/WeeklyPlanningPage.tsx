import React, { useState, useEffect } from 'react';
import { useWeeklyPlanning } from '../contexts/WeeklyPlanningContext';
import { TaskReviewItem, TaskPriority, RoutineSchedule } from '../types';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  Stack,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { Timestamp } from 'firebase/firestore';
import { NextWeekTaskPlanner } from '../components/NextWeekTaskPlanner';
import { RecurringTaskScheduler } from '../components/RecurringTaskScheduler';
import { v4 as uuidv4 } from 'uuid';
import { WeeklyPlanSummary } from '../components/WeeklyPlanSummary';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useGoalsContext } from '../contexts/GoalsContext';

interface PlannedTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: Date;
}

interface RecurringTask {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: RoutineSchedule;
}

interface UnscheduledItem {
  id: string;
  type: 'task' | 'routine';
  title: string;
  description?: string;
  goalId?: string;
  goalName?: string;
  priority?: string;
  suggestedDate?: Date;
}

const steps = ['Start Session', 'Weekly Review', 'Weekly Planning', 'Finalize'];

export const WeeklyPlanningPage: React.FC = () => {
  const {
    currentSession,
    isLoading,
    error,
    startNewSession,
    moveToReviewPhase,
    moveToPlanningPhase,
    completeSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview,
    sendTeamReminders,
    syncWithCalendar
  } = useWeeklyPlanning();

  const [activeStep, setActiveStep] = useState(0);

  const handleNext = async () => {
    switch (activeStep) {
      case 0:
        await startNewSession();
        break;
      case 1:
        await moveToReviewPhase();
        break;
      case 2:
        await moveToPlanningPhase();
        break;
      case 3:
        await completeSession();
        break;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <StartSessionStep onNext={handleNext} />;
      case 1:
        return <WeeklyReviewStep onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <WeeklyPlanningStep onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <FinalizeStep onNext={handleNext} onBack={handleBack} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Weekly Planning & Review
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {renderStepContent(activeStep)}
      </Box>
    </Container>
  );
};

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

const StartSessionStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Start Your Weekly Planning Session
      </Typography>
      <Typography paragraph>
        Welcome to your weekly planning and review session. This process will help you:
      </Typography>
      <ul>
        <li>Review your progress from the past week</li>
        <li>Reflect on your goals and habits</li>
        <li>Plan your priorities for the upcoming week</li>
        <li>Coordinate with your team on shared goals</li>
      </ul>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={onNext}>
          Start Session
        </Button>
      </Box>
    </Paper>
  );
};

const WeeklyReviewStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const {
    currentSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview,
    sendTeamReminders
  } = useWeeklyPlanning();
  const { goals } = useGoalsContext();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    await updateTaskReview({
      taskId,
      title: 'Task Title', // TODO: Get actual task title
      status: action === 'mark_completed' ? 'completed' : action === 'mark_missed' ? 'missed' : 'needs_review',
      originalDueDate: Timestamp.now(), // TODO: Get actual due date
      action: action as any
    });
  };

  const handleGoalReview = async (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => {
    await updateLongTermGoalReview(goalId, madeProgress, adjustments);
  };

  const handleSharedGoalUpdate = async (goalId: string, taskId: string, status: 'completed' | 'pending') => {
    await updateSharedGoalReview(goalId, status === 'completed' ? [taskId] : [], status === 'pending' ? [taskId] : []);
  };

  const handleSendReminder = async (goalId: string, userId: string) => {
    await sendTeamReminders(goalId, [userId]);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weekly Review
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="review tabs">
          <Tab label="Tasks & Routines" />
          <Tab label="Long-term Goals" />
          <Tab label="Shared Goals" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <TaskReviewList
          tasks={currentSession?.reviewPhase.taskReviews || []}
          onTaskAction={handleTaskAction}
        />
      )}

      {activeTab === 1 && (
        <Stack spacing={3}>
          {goals.map(goal => (
            <LongTermGoalReview
              key={goal.id}
              goalId={goal.id}
              goalName={goal.name}
              description={goal.specificAction}
              lastReviewDate={goal.timeTracking.reviewStatus?.lastReviewDate || Timestamp.now()}
              nextReviewDate={goal.timeTracking.nextReviewDate || Timestamp.now()}
              onUpdateReview={handleGoalReview}
            />
          ))}
          {goals.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No long-term goals found. Create some goals to start tracking your progress.
            </Typography>
          )}
        </Stack>
      )}

      {activeTab === 2 && (
        <Stack spacing={3}>
          {/* TODO: Get shared goals from currentSession */}
          <SharedGoalReview
            goalId="example"
            goalName="Example Shared Goal"
            tasks={[]}
            collaborators={[]}
            onSendReminder={handleSendReminder}
            onUpdateTaskStatus={handleSharedGoalUpdate}
          />
        </Stack>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onNext}>
          Continue to Planning
        </Button>
      </Box>
    </Paper>
  );
};

const WeeklyPlanningStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const {
    currentSession,
    unscheduledItems,
    addNextWeekTask,
    scheduleRecurringTask,
    fetchUnscheduledItems,
    getScheduleSuggestions
  } = useWeeklyPlanning();

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    item: UnscheduledItem;
    date: Date;
    start?: Date;
    end?: Date;
  } | null>(null);

  useEffect(() => {
    fetchUnscheduledItems();
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const itemId = result.draggableId;
    const dayIndex = parseInt(result.destination.droppableId.replace('day-', ''));
    const item = unscheduledItems.find(i => i.id === itemId);
    
    if (!item) return;

    const date = addDays(startOfWeek(new Date()), dayIndex);
    setSelectedTimeSlot({ item, date });
  };

  const handleTimeSlotConfirm = async () => {
    if (!selectedTimeSlot) return;

    const { item, date, start, end } = selectedTimeSlot;
    
    if (item.type === 'task') {
      await addNextWeekTask(
        item.id,
        item.priority || 'medium',
        date,
        start && end ? { start, end } : undefined
      );
    } else {
      // Handle routine scheduling
      await scheduleRecurringTask(item.id, 'weekly', {
        daysOfWeek: [format(date, 'EEEE').toLowerCase()],
        timeOfDay: start ? {
          hour: start.getHours(),
          minute: start.getMinutes()
        } : undefined
      });
    }

    setSelectedTimeSlot(null);
  };

  const renderTimeSlotDialog = () => {
    if (!selectedTimeSlot) return null;

    return (
      <Dialog open={true} onClose={() => setSelectedTimeSlot(null)}>
        <DialogTitle>
          Schedule {selectedTimeSlot.item.type === 'task' ? 'Task' : 'Routine'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedTimeSlot.item.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {format(selectedTimeSlot.date, 'EEEE, MMMM d')}
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Time Slot (Optional)
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TimePicker
                    label="Start Time"
                    value={selectedTimeSlot.start || null}
                    onChange={(newValue) => {
                      if (selectedTimeSlot) {
                        setSelectedTimeSlot({
                          ...selectedTimeSlot,
                          start: newValue || undefined
                        });
                      }
                    }}
                  />
                  <TimePicker
                    label="End Time"
                    value={selectedTimeSlot.end || null}
                    onChange={(newValue) => {
                      if (selectedTimeSlot) {
                        setSelectedTimeSlot({
                          ...selectedTimeSlot,
                          end: newValue || undefined
                        });
                      }
                    }}
                  />
                </Box>
              </LocalizationProvider>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTimeSlot(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleTimeSlotConfirm}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Weekly Planning
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 300px)' }}>
          <Box sx={{ width: 300 }}>
            <Typography variant="h6" gutterBottom>
              Unscheduled Items
            </Typography>
            
            <Droppable droppableId="unscheduled">
              {(provided) => (
                <List
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1
                  }}
                >
                  {unscheduledItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: 'action.hover' 
                            }
                          }}
                        >
                          <ListItemText
                            primary={item.title}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={item.type}
                                  size="small"
                                  color={item.type === 'task' ? 'primary' : 'secondary'}
                                />
                                {item.goalName && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.goalName}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <DragIndicatorIcon color="action" />
                          </ListItemSecondaryAction>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Grid container spacing={2}>
              {Array.from({ length: 7 }, (_, index) => {
                const day = addDays(startOfWeek(new Date()), index);
                return (
                  <Grid item xs key={index}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        bgcolor: isSameDay(day, new Date()) ? 'primary.light' : 'background.paper'
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        {format(day, 'EEEE')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(day, 'MMM d')}
                      </Typography>

                      <Droppable droppableId={`day-${index}`}>
                        {(provided) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{ 
                              minHeight: 100,
                              mt: 2,
                              border: '2px dashed',
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 1
                            }}
                          >
                            {currentSession?.planningPhase.nextWeekTasks
                              .filter(task => isSameDay(task.dueDate.toDate(), day))
                              .map((task, taskIndex) => (
                                <Box
                                  key={task.taskId}
                                  sx={{
                                    p: 1,
                                    mb: 1,
                                    bgcolor: 'background.default',
                                    borderRadius: 1,
                                    boxShadow: 1
                                  }}
                                >
                                  <Typography variant="body2" noWrap>
                                    {task.taskId}
                                  </Typography>
                                </Box>
                              ))}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>

        {renderTimeSlotDialog()}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onBack}>Back</Button>
          <Button variant="contained" onClick={onNext}>
            Continue to Finalize
          </Button>
        </Box>
      </Paper>
    </DragDropContext>
  );
};

const FinalizeStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const {
    currentSession,
    syncWithCalendar
  } = useWeeklyPlanning();

  if (!currentSession) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">
          No active planning session found.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Finalize Your Weekly Plan
      </Typography>

      <WeeklyPlanSummary
        session={currentSession}
        onSyncCalendar={syncWithCalendar}
      />

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onNext}>
          Complete Session
        </Button>
      </Box>
    </Paper>
  );
}; 