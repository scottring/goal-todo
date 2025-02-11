import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useWeeklyPlanning } from '../contexts/WeeklyPlanningContext';
import { TaskReviewItem, TaskPriority, RoutineSchedule, DaySchedule, TimeOfDay } from '../types';
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
  TextField,
  Badge,
  Alert
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { Timestamp } from 'firebase/firestore';
import { NextWeekTaskPlanner } from '../components/NextWeekTaskPlanner';
import { RecurringTaskScheduler } from '../components/RecurringTaskScheduler';
import { v4 as uuidv4 } from 'uuid';
import { WeeklyPlanSummary } from '../components/WeeklyPlanSummary';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useGoalsContext } from '../contexts/GoalsContext';
import { updateDocument } from '../utils/firestore';

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

interface WeeklyPlanningContextType {
  currentSession: any;
  isLoading: boolean;
  error: string | null;
  startNewSession: () => Promise<void>;
  moveToReviewPhase: () => Promise<void>;
  moveToPlanningPhase: () => Promise<void>;
  completeSession: () => Promise<void>;
  updateTaskReview: (task: TaskReviewItem) => Promise<void>;
  updateLongTermGoalReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
  updateSharedGoalReview: (goalId: string, completedTasks: string[], pendingTasks: string[]) => Promise<void>;
  sendTeamReminders: (goalId: string, userIds: string[]) => Promise<void>;
  syncWithCalendar: () => Promise<void>;
  setCurrentSession: Dispatch<SetStateAction<any>>;
  setUnscheduledItems: Dispatch<SetStateAction<UnscheduledItem[]>>;
  updateSession: (session: any) => Promise<void>;
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
    syncWithCalendar,
    setCurrentSession,
    setUnscheduledItems,
    updateSession
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
    try {
      await updateLongTermGoalReview(goalId, madeProgress, adjustments, nextReviewDate);
    } catch (error) {
      console.error('Error updating goal review:', error);
    }
  };

  const handleSharedGoalUpdate = async (goalId: string, taskId: string, status: 'completed' | 'pending') => {
    await updateSharedGoalReview(goalId, status === 'completed' ? [taskId] : [], status === 'pending' ? [taskId] : []);
  };

  const handleSendReminder = async (goalId: string, userId: string) => {
    await sendTeamReminders(goalId, [userId]);
  };

  const getTaskReviewCount = () => {
    return currentSession?.reviewPhase?.taskReviews?.length || 0;
  };

  const getSharedGoalReviewCount = () => {
    return currentSession?.reviewPhase?.sharedGoalReviews?.length || 0;
  };

  const getLongTermGoalCount = () => {
    return goals?.length || 0;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weekly Review
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="review tabs">
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>TASKS & ROUTINES</span>
                {getTaskReviewCount() > 0 && (
                  <Badge badgeContent={getTaskReviewCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>LONG-TERM GOALS</span>
                {getLongTermGoalCount() > 0 && (
                  <Badge badgeContent={getLongTermGoalCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>SHARED GOALS</span>
                {getSharedGoalReviewCount() > 0 && (
                  <Badge badgeContent={getSharedGoalReviewCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
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
              lastReviewDate={goal.timeTracking.reviewStatus?.lastReviewDate}
              nextReviewDate={goal.timeTracking.nextReviewDate}
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

const SortableItem = ({ id, item }: { id: string; item: UnscheduledItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 0
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{ 
        '&:hover': { bgcolor: 'action.hover' },
        cursor: 'grab'
      }}
    >
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{ component: 'span' }}
        secondaryTypographyProps={{ component: 'span' }}
        secondary={
          <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={item.type}
              size="small"
              color={item.type === 'task' ? 'primary' : 'secondary'}
            />
            {item.goalName && (
              <Typography component="span" variant="caption" color="text.secondary">
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
  );
};

const DroppableDay = ({ day, index, children }: { day: Date; index: number; children: React.ReactNode }) => {
  const {
    setNodeRef,
    isOver
  } = useSortable({
    id: `day-${index}`,
    data: {
      type: 'day',
      date: day
    }
  });

  return (
    <Paper 
      ref={setNodeRef}
      sx={{ 
        p: 2, 
        height: '100%',
        bgcolor: isSameDay(day, new Date()) ? 'primary.light' : 'background.paper',
        border: isOver ? '2px dashed' : '2px solid transparent',
        borderColor: isOver ? 'primary.main' : 'transparent'
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        {format(day, 'EEEE')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {format(day, 'MMM d')}
      </Typography>
      <Box sx={{ 
        minHeight: 100,
        mt: 2,
        borderRadius: 1,
        p: 1
      }}>
        {children}
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
    getScheduleSuggestions,
    updateSession
  } = useWeeklyPlanning();

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    item: UnscheduledItem;
    date: Date;
    start?: Date;
    end?: Date;
  } | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [localUnscheduledItems, setLocalUnscheduledItems] = useState<UnscheduledItem[]>(unscheduledItems);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<{[key: string]: string}>({});  // Map taskId to title

  useEffect(() => {
    fetchUnscheduledItems();
  }, []);

  useEffect(() => {
    setLocalUnscheduledItems(unscheduledItems);
  }, [unscheduledItems]);

  useEffect(() => {
    // Initialize scheduledTasks with existing tasks from currentSession
    if (currentSession?.planningPhase?.nextWeekTasks) {
      const taskMap = {};
      currentSession.planningPhase.nextWeekTasks.forEach(task => {
        const item = unscheduledItems.find(i => i.id === task.taskId);
        if (item) {
          taskMap[task.taskId] = item.title;
        }
      });
      setScheduledTasks(taskMap);
    }
  }, [currentSession]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const itemId = active.id as string;
    const targetId = over.id as string;
    
    if (targetId.startsWith('day-')) {
      const dayIndex = parseInt(targetId.replace('day-', ''));
      const item = unscheduledItems.find(i => i.id === itemId);
      
      if (!item) return;

      const date = addDays(startOfWeek(new Date()), dayIndex);
      setSelectedTimeSlot({ item, date });
    }
  };

  const handleTimeSlotConfirm = async () => {
    if (!selectedTimeSlot) return;

    const { item, date, start, end } = selectedTimeSlot;
    
    try {
      if (item.type === 'task') {
        // Validate and create task data with default values if needed
        const taskData = {
          taskId: item.id,
          priority: (item.priority as TaskPriority) || 'medium',
          dueDate: Timestamp.fromDate(date)
        };

        // Validate taskData
        if (!taskData.taskId || !taskData.priority || !taskData.dueDate) {
          console.error('Invalid task data:', taskData);
          throw new Error('Invalid task data: Missing required fields');
        }

        // Create calendar event only if both start and end times exist
        let calendarEvent = null;
        if (start && end) {
          calendarEvent = {
            eventId: `task_${item.id}`,
            taskId: item.id,
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end)
          };
        }

        if (currentSession) {
          const updatedSession = { ...currentSession };
          
          // Initialize planningPhase if it doesn't exist
          if (!updatedSession.planningPhase) {
            updatedSession.planningPhase = {
              nextWeekTasks: [],
              sharedGoalAssignments: [],
              recurringTasks: [],
              calendarSyncStatus: {
                synced: false,
                syncedEvents: []
              }
            };
          }

          // Ensure all arrays exist
          if (!Array.isArray(updatedSession.planningPhase.nextWeekTasks)) {
            updatedSession.planningPhase.nextWeekTasks = [];
          }
          if (!Array.isArray(updatedSession.planningPhase.sharedGoalAssignments)) {
            updatedSession.planningPhase.sharedGoalAssignments = [];
          }
          if (!Array.isArray(updatedSession.planningPhase.recurringTasks)) {
            updatedSession.planningPhase.recurringTasks = [];
          }

          // Ensure calendarSyncStatus exists
          if (!updatedSession.planningPhase.calendarSyncStatus) {
            updatedSession.planningPhase.calendarSyncStatus = {
              synced: false,
              syncedEvents: []
            };
          }
          if (!Array.isArray(updatedSession.planningPhase.calendarSyncStatus.syncedEvents)) {
            updatedSession.planningPhase.calendarSyncStatus.syncedEvents = [];
          }

          // Add the task
          updatedSession.planningPhase.nextWeekTasks.push(taskData);

          // Add calendar event if it exists
          if (calendarEvent) {
            updatedSession.planningPhase.calendarSyncStatus.syncedEvents.push(calendarEvent);
          }

          // Clean any potential undefined values before updating
          const cleanedSession = JSON.parse(JSON.stringify(updatedSession));
          await updateSession(cleanedSession);

          // Update task scheduling only after session is updated
          await addNextWeekTask(
            item.id,
            taskData.priority,
            date,
            start && end ? { start, end } : undefined
          );
        }

        // After successful scheduling
        setScheduledTasks(prev => ({
          ...prev,
          [item.id]: item.title
        }));
        setSuccessMessage(`Successfully scheduled "${item.title}" for ${format(date, 'EEEE, MMMM d')}`);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Update local unscheduled items list
        setLocalUnscheduledItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        // Handle routine scheduling
        const timeOfDay: TimeOfDay = start ? {
          hour: start.getHours(),
          minute: start.getMinutes()
        } : { hour: 9, minute: 0 }; // Default to 9 AM if no time selected

        const daySchedule: DaySchedule = {
          day: format(date, 'EEEE').toLowerCase() as DaySchedule['day'],
          time: timeOfDay
        };

        const scheduleData = {
          routineId: item.id,
          frequency: 'weekly' as const,
          schedule: {
            type: 'weekly' as const,
            daysOfWeek: [daySchedule],
            targetCount: 1
          }
        };

        if (currentSession) {
          const updatedSession = { ...currentSession };
          
          // Initialize planningPhase if it doesn't exist
          if (!updatedSession.planningPhase) {
            updatedSession.planningPhase = {
              nextWeekTasks: [],
              sharedGoalAssignments: [],
              recurringTasks: [],
              calendarSyncStatus: {
                synced: false,
                syncedEvents: []
              }
            };
          }

          // Ensure all arrays exist
          if (!Array.isArray(updatedSession.planningPhase.nextWeekTasks)) {
            updatedSession.planningPhase.nextWeekTasks = [];
          }
          if (!Array.isArray(updatedSession.planningPhase.sharedGoalAssignments)) {
            updatedSession.planningPhase.sharedGoalAssignments = [];
          }
          if (!Array.isArray(updatedSession.planningPhase.recurringTasks)) {
            updatedSession.planningPhase.recurringTasks = [];
          }

          // Add the routine
          updatedSession.planningPhase.recurringTasks.push(scheduleData);

          // Clean any potential undefined values before updating
          const cleanedSession = JSON.parse(JSON.stringify(updatedSession));
          await updateSession(cleanedSession);

          // Update routine scheduling only after session is updated
          await scheduleRecurringTask(item.id, 'weekly', {
            type: 'weekly',
            daysOfWeek: [daySchedule],
            timeOfDay,
            targetCount: 1
          });
        }

        setSuccessMessage(`Successfully scheduled routine "${item.title}" for ${format(date, 'EEEE, MMMM d')}`);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Update local unscheduled items list
        setLocalUnscheduledItems(prev => prev.filter(i => i.id !== item.id));
      }
    } catch (error) {
      console.error('Error scheduling item:', error);
      setSuccessMessage(`Error scheduling item: ${error.message}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setSelectedTimeSlot(null);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weekly Planning
      </Typography>

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 300px)', overflow: 'auto' }}>
          <Box sx={{ width: 300, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Unscheduled Items
            </Typography>
            
            <List sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
              minHeight: 100
            }}>
              <SortableContext items={unscheduledItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {unscheduledItems.map((item) => (
                  <SortableItem key={item.id} id={item.id} item={item} />
                ))}
              </SortableContext>
            </List>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Grid container spacing={2}>
              {Array.from({ length: 7 }, (_, index) => {
                const day = addDays(startOfWeek(new Date()), index);
                return (
                  <Grid item xs key={index}>
                    <DroppableDay day={day} index={index}>
                      {currentSession?.planningPhase?.nextWeekTasks
                        ?.filter(task => isSameDay(task.dueDate.toDate(), day))
                        ?.map((task) => (
                          <Box
                            key={task.taskId}
                            sx={{
                              p: 1,
                              mb: 1,
                              bgcolor: 'background.default',
                              borderRadius: 1,
                              boxShadow: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Box
                              sx={{
                                width: 4,
                                height: 24,
                                borderRadius: 1,
                                bgcolor: task.priority === 'high' ? 'error.main' : 
                                        task.priority === 'medium' ? 'warning.main' : 
                                        'success.main'
                              }}
                            />
                            <Typography variant="body2" noWrap>
                              {scheduledTasks[task.taskId] || task.taskId}
                            </Typography>
                          </Box>
                        ))}
                    </DroppableDay>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>

        <DragOverlay>
          {activeId ? (
            <Paper sx={{ p: 2, bgcolor: 'background.paper', width: 280 }}>
              <Typography variant="body1">
                {unscheduledItems.find(item => item.id === activeId)?.title}
              </Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTimeSlot && (
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
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onNext}>
          Continue to Finalize
        </Button>
      </Box>
    </Paper>
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