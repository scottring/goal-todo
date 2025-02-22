import React, { useState, useEffect } from 'react';
import { useWeeklyPlanning, UnscheduledItem } from '../contexts/WeeklyPlanningContext';
import { TaskReviewItem, TaskPriority, RoutineSchedule, DaySchedule, TimeOfDay, SourceActivity } from '../types';
import { dateToTimestamp, timestampToDate, now } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';
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
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Alert,
  TextField,
  FormControl,
  FormLabel
} from '@mui/material';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { WeeklyPlanSummary } from '../components/WeeklyPlanSummary';
import { format, addDays, isSameDay, startOfWeek, isSunday, nextSunday, previousSunday, isAfter, isBefore, startOfDay, addWeeks } from 'date-fns';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useGoalsContext } from '../contexts/GoalsContext';
import { DatePicker } from '@mui/x-date-pickers';

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

interface WeeklyPlanningContextType {
  currentSession: any;
  isLoading: boolean;
  error: string | null;
  startNewSession: (reviewStartDate?: Date) => Promise<void>;
  moveToReviewPhase: () => Promise<void>;
  moveToPlanningPhase: () => Promise<void>;
  completeSession: () => Promise<void>;
  updateTaskReview: (task: TaskReviewItem) => Promise<void>;
  updateLongTermGoalReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
  updateSharedGoalReview: (goalId: string, completedTasks: string[], pendingTasks: string[]) => Promise<void>;
  sendTeamReminders: (goalId: string, userIds: string[]) => Promise<void>;
  syncWithCalendar: () => Promise<void>;
  updateSession: (session: any) => Promise<void>;
  unscheduledItems: UnscheduledItem[];
  addNextWeekTask: (taskId: string, priority: TaskPriority, date: Date, timeSlot?: { start: Date; end: Date }) => Promise<void>;
  scheduleRecurringTask: (routineId: string, frequency: string, schedule: any) => Promise<void>;
  fetchUnscheduledItems: () => Promise<void>;
  getScheduleSuggestions: () => Promise<void>;
  getLastReviewDate: () => Promise<Date | null>;
  updateDateRanges: (startDate: Date, endDate: Date) => Promise<void>;
}

const steps = ['Start Session', 'Weekly Review', 'Weekly Planning', 'Finalize'];

const getWeekBoundaries = (currentDate: Date = new Date()): { weekStart: Date; weekEnd: Date } => {
  const today = startOfDay(currentDate);
  const nextSundayDate = nextSunday(today);
  const prevSundayDate = previousSunday(today);
  
  // If today is Sunday, use today as start and next Sunday as end
  if (isSunday(today)) {
    return {
      weekStart: today,
      weekEnd: nextSundayDate
    };
  }
  
  // If we're within 3 days after the previous Sunday
  const threeDaysAfterPrevSunday = addDays(prevSundayDate, 3);
  if (isBefore(today, threeDaysAfterPrevSunday)) {
    return {
      weekStart: prevSundayDate,
      weekEnd: nextSundayDate
    };
  }
  
  // If we're within 3 days before next Sunday
  const threeDaysBeforeNextSunday = addDays(nextSundayDate, -3);
  if (isAfter(today, threeDaysBeforeNextSunday)) {
    return {
      weekStart: today,
      weekEnd: nextSundayDate
    };
  }
  
  // For days in the middle of the week, start from today
  return {
    weekStart: today,
    weekEnd: nextSundayDate
  };
};

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
    updateSession,
    unscheduledItems,
    addNextWeekTask,
    scheduleRecurringTask,
    fetchUnscheduledItems,
    getScheduleSuggestions,
    getLastReviewDate,
    updateDateRanges
  } = useWeeklyPlanning();

  const [activeStep, setActiveStep] = useState(0);
  const [weekDays, setWeekDays] = useState<Date[]>([]);

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

  useEffect(() => {
    // Initialize week days based on current date
    const { weekStart, weekEnd } = getWeekBoundaries();
    const days: Date[] = [];
    let currentDay = weekStart;
    
    while (currentDay <= weekEnd) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    
    setWeekDays(days);
  }, []);

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography>Loading weekly planning...</Typography>
        </Box>
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

  if (!currentSession) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            No active weekly planning session
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => startNewSession()}
            sx={{ mt: 2 }}
          >
            Start New Session
          </Button>
        </Box>
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
  const { startNewSession, getLastReviewDate, isLoading } = useWeeklyPlanning();
  const [reviewStartDate, setReviewStartDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set default review start date
    const loadLastReviewDate = async () => {
      const lastReview = await getLastReviewDate();
      const defaultStart = lastReview || addWeeks(startOfDay(new Date()), -1);
      setReviewStartDate(defaultStart);
    };
    loadLastReviewDate();
  }, [getLastReviewDate]);

  const handleStartSession = async () => {
    if (!reviewStartDate) {
      setError('Please select a review start date');
      return;
    }

    const today = startOfDay(new Date());
    if (isAfter(reviewStartDate, today)) {
      setError('Review start date cannot be in the future');
      return;
    }

    try {
      await startNewSession(reviewStartDate);
      onNext();
    } catch (err) {
      setError('Failed to start session');
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Start Weekly Planning Session
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <FormControl fullWidth>
          <FormLabel>Review Period Start Date</FormLabel>
          <DatePicker
            value={reviewStartDate}
            onChange={(date) => {
              setReviewStartDate(date);
              setError(null);
            }}
            maxDate={new Date()}
            sx={{ mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Select the start date for your review period. This is typically since your last review
            or up to a week ago.
          </Typography>
        </FormControl>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleStartSession}
            disabled={isLoading || !reviewStartDate}
          >
            Start Session
          </Button>
        </Box>
      </Paper>
    </Box>
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

  const isGoalDueForReview = (goal: SourceActivity): boolean => {
    if (!currentSession) return false;

    // Only consider goals with recurring review type
    if (goal.timeTracking.type !== 'recurring_review') return false;

    const nextReviewDate = goal.timeTracking.nextReviewDate;
    if (!nextReviewDate) return false;

    // Convert Firebase timestamp if needed
    const reviewDate = 'toDate' in nextReviewDate ? 
      fromFirebaseTimestamp(nextReviewDate as any) : 
      nextReviewDate;

    // Get the date range for the current weekly review
    const weekStart = timestampToDate(currentSession.weekStartDate);
    const weekEnd = timestampToDate(currentSession.weekEndDate);

    // Check if the next review date falls within this week
    const reviewDateTime = timestampToDate(reviewDate);
    return reviewDateTime >= weekStart && reviewDateTime <= weekEnd;
  };

  const goalsForReview = goals.filter(isGoalDueForReview);

  const handleTaskAction = async (taskId: string, action: string) => {
    const task = currentSession?.reviewPhase?.taskReviews?.find(t => t.taskId === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    await updateTaskReview({
      taskId,
      title: task.title || 'Untitled Task',
      status: action === 'mark_completed' ? 'completed' : action === 'mark_missed' ? 'missed' : 'needs_review',
      originalDueDate: task.originalDueDate || now(),
      action: action as any,
      priority: task.priority || 'medium',
      completedDate: action === 'mark_completed' ? now() : undefined
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
    return currentSession?.reviewPhase.taskReviews?.length || 0;
  };

  const getSharedGoalReviewCount = () => {
    return currentSession?.reviewPhase?.sharedGoalReviews?.length || 0;
  };

  const getLongTermGoalCount = () => {
    return goalsForReview.length;
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
          {goalsForReview.map(goal => {
            const lastReviewDate = goal.timeTracking.reviewStatus?.lastReviewDate;
            const nextReviewDate = goal.timeTracking.nextReviewDate;

            return (
              <LongTermGoalReview
                key={goal.id}
                goalId={goal.id}
                goalName={goal.name}
                description={goal.specificAction}
                lastReviewDate={lastReviewDate ? fromFirebaseTimestamp(lastReviewDate as any) : undefined}
                nextReviewDate={nextReviewDate ? fromFirebaseTimestamp(nextReviewDate as any) : undefined}
                onUpdateReview={handleGoalReview}
              />
            );
          })}
          {goalsForReview.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No goals due for review this week.
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

const UnscheduledTaskItem = ({ 
  item,
  onSchedule 
}: { 
  item: UnscheduledItem;
  onSchedule: (item: UnscheduledItem) => void;
}) => {
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="subtitle1">{item.title}</Typography>
          {item.description && (
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onSchedule(item)}
          startIcon={<AccessTimeIcon />}
        >
          Schedule
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
    </Box>
  );
};

const DayCard = ({ 
  day,
  isSelectable,
  onSelect,
  children 
}: { 
  day: Date;
  isSelectable: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Paper 
      onClick={isSelectable ? onSelect : undefined}
      sx={{ 
        p: 2, 
        height: '100%',
        bgcolor: isSameDay(day, new Date()) ? 'primary.light' : 'background.paper',
        cursor: isSelectable ? 'pointer' : 'default',
        border: isSelectable ? '2px dashed' : '2px solid transparent',
        borderColor: isSelectable ? 'primary.main' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': isSelectable ? {
          borderColor: 'primary.dark',
          bgcolor: 'action.hover'
        } : {}
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
    updateDateRanges,
    unscheduledItems,
    addNextWeekTask,
    scheduleRecurringTask,
    fetchUnscheduledItems,
    getScheduleSuggestions,
    updateSession
  } = useWeeklyPlanning();
  const { goals } = useGoalsContext();

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    item: UnscheduledItem;
    date: Date;
    start?: Date;
    end?: Date;
  } | null>(null);

  const [schedulingItem, setSchedulingItem] = useState<UnscheduledItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<Record<string, string>>({});
  const [localUnscheduledItems, setLocalUnscheduledItems] = useState<UnscheduledItem[]>([]);
  const [hasScheduledNewItem, setHasScheduledNewItem] = useState(false);

  const [planningStartDate, setPlanningStartDate] = useState<Date>(new Date());
  const [planningEndDate, setPlanningEndDate] = useState<Date>(nextSunday(new Date()));
  const [dateError, setDateError] = useState<string | null>(null);

  // Initialize localUnscheduledItems only once when component mounts or when explicitly fetched
  useEffect(() => {
    if (!hasScheduledNewItem) {
      setLocalUnscheduledItems(unscheduledItems);
    }
  }, [unscheduledItems, hasScheduledNewItem]);

  // Fetch unscheduled items only when component mounts or goals change
  useEffect(() => {
    fetchUnscheduledItems();
  }, [goals]); // Removed currentSession dependency

  useEffect(() => {
    // Initialize scheduledTasks with existing tasks from currentSession
    if (currentSession?.planningPhase?.nextWeekTasks) {
      const taskMap: Record<string, string> = {};
      currentSession.planningPhase.nextWeekTasks.forEach((task: { taskId: string }) => {
        const item = unscheduledItems.find(i => i.id === task.taskId);
        if (item) {
          taskMap[task.taskId] = item.title;
        }
      });
      setScheduledTasks(taskMap);
    }
  }, [currentSession, unscheduledItems]);

  useEffect(() => {
    if (currentSession?.planningPhase) {
      setPlanningStartDate(timestampToDate(currentSession.planningPhase.startDate));
      setPlanningEndDate(timestampToDate(currentSession.planningPhase.endDate));
    }
  }, [currentSession]);

  const handleScheduleClick = (item: UnscheduledItem) => {
    setSchedulingItem(item);
  };

  const handleDaySelect = (day: Date) => {
    if (schedulingItem) {
      setSelectedTimeSlot({
        item: schedulingItem,
        date: day
      });
      setSchedulingItem(null);
    }
  };

  const handleTimeSlotConfirm = async () => {
    if (!selectedTimeSlot) return;

    const { item, date, start, end } = selectedTimeSlot;
    
    try {
      if (item.type === 'task') {
        const taskData = {
          taskId: item.id,
          priority: (item.priority as TaskPriority) || 'medium',
          dueDate: dateToTimestamp(date)
        };

        let calendarEvent = null;
        if (start && end) {
          calendarEvent = {
            eventId: `task_${item.id}`,
            taskId: item.id,
            startTime: dateToTimestamp(start),
            endTime: dateToTimestamp(end)
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

          // Add the task
          updatedSession.planningPhase.nextWeekTasks.push(taskData);

          // Add calendar event if it exists
          if (calendarEvent) {
            updatedSession.planningPhase.calendarSyncStatus.syncedEvents.push(calendarEvent);
          }

          await updateSession(updatedSession);

          // After successful scheduling, remove the item from localUnscheduledItems
          setLocalUnscheduledItems(prev => prev.filter(i => i.id !== item.id));
          setHasScheduledNewItem(true); // Prevent useEffect from resetting our local state
        }

        // After successful scheduling
        setScheduledTasks(prev => ({
          ...prev,
          [item.id]: item.title
        }));
        setSuccessMessage(`Successfully scheduled "${item.title}" for ${format(date, 'EEEE, MMMM d')}`);
        setTimeout(() => setSuccessMessage(null), 3000);
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

          // Add the routine
          updatedSession.planningPhase.recurringTasks.push(scheduleData);

          await updateSession(updatedSession);

          // After successful scheduling, remove the item from localUnscheduledItems
          setLocalUnscheduledItems(prev => prev.filter(i => i.id !== item.id));
          setHasScheduledNewItem(true); // Prevent useEffect from resetting our local state
        }

        setSuccessMessage(`Successfully scheduled routine "${item.title}" for ${format(date, 'EEEE, MMMM d')}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: unknown) {
      console.error('Error scheduling item:', error);
      setSuccessMessage(`Error scheduling item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setSelectedTimeSlot(null);
  };

  const handleDateRangeUpdate = async () => {
    if (!currentSession) return;

    const today = startOfDay(new Date());
    if (isBefore(planningEndDate, planningStartDate)) {
      setDateError('End date must be after start date');
      return;
    }

    if (isBefore(planningStartDate, today)) {
      setDateError('Planning start date cannot be in the past');
      return;
    }

    try {
      await updateDateRanges(
        timestampToDate(currentSession.reviewPhase.startDate),
        planningStartDate,
        planningEndDate
      );
      setDateError(null);
    } catch (err) {
      setDateError('Failed to update date range');
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Plan Your Week
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth>
          <FormLabel>Planning Period</FormLabel>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <DatePicker
              label="Start Date"
              value={planningStartDate}
              onChange={(date) => {
                if (date) {
                  setPlanningStartDate(date);
                  setDateError(null);
                }
              }}
              minDate={new Date()}
              sx={{ flex: 1 }}
            />
            <DatePicker
              label="End Date"
              value={planningEndDate}
              onChange={(date) => {
                if (date) {
                  setPlanningEndDate(date);
                  setDateError(null);
                }
              }}
              minDate={planningStartDate}
              sx={{ flex: 1 }}
            />
          </Box>
          <Button
            variant="outlined"
            onClick={handleDateRangeUpdate}
            sx={{ mt: 2, alignSelf: 'flex-end' }}
          >
            Update Date Range
          </Button>
          {dateError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {dateError}
            </Alert>
          )}
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 300px)', overflow: 'auto' }}>
        <Box sx={{ width: 300, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Unscheduled Items
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
            minHeight: 100,
            p: 2
          }}>
            {localUnscheduledItems.map((item) => (
              <UnscheduledTaskItem
                key={`unscheduled-${item.id}`}
                item={item}
                onSchedule={handleScheduleClick}
              />
            ))}
            {localUnscheduledItems.length === 0 && (
              <Typography color="text.secondary" align="center">
                No unscheduled items
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Grid container spacing={2}>
            {weekDays.map((day, index) => {
              return (
                <Grid item xs key={`day-grid-${index}`}>
                  <DayCard 
                    day={day}
                    isSelectable={!!schedulingItem}
                    onSelect={() => handleDaySelect(day)}
                  >
                    {currentSession?.planningPhase?.nextWeekTasks
                      ?.filter(task => {
                        if (!task.dueDate) return false;
                        const dueDate = 'toDate' in task.dueDate ? fromFirebaseTimestamp(task.dueDate as any) : task.dueDate;
                        return isSameDay(timestampToDate(dueDate), day);
                      })
                      ?.map((task) => (
                        <Box
                          key={`scheduled-task-${task.taskId}`}
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
                            {scheduledTasks[task.taskId] || `Task ${task.taskId}`}
                          </Typography>
                        </Box>
                      ))}
                  </DayCard>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

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
    </Box>
  );
};

const FinalizeStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const {
    currentSession,
    syncWithCalendar
  } = useWeeklyPlanning();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentSession) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">
          No active planning session found.
        </Typography>
      </Paper>
    );
  }

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onNext();
      setIsCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Weekly planning session completed successfully! Your review and plan have been saved.
        </Alert>
        
        <Typography variant="h5" gutterBottom>
          Session Complete
        </Typography>
        
        <Typography paragraph>
          Your weekly planning session has been completed. Here's what was saved:
        </Typography>
        
        <Stack spacing={2}>
          <Typography>
            • Review of last week's tasks ({currentSession.reviewPhase.taskReviews.length} tasks reviewed)
          </Typography>
          <Typography>
            • Next week's task schedule ({currentSession.planningPhase.nextWeekTasks.length} tasks scheduled)
          </Typography>
          <Typography>
            • Habits and routines ({currentSession.planningPhase.recurringTasks.length} routines scheduled)
          </Typography>
        </Stack>

        <Typography sx={{ mt: 3 }} variant="subtitle1">
          You can now check your calendar and daily dashboard for your scheduled tasks and routines.
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
        <Button onClick={onBack}>
          Back
        </Button>
        <Button 
          variant="contained" 
          onClick={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Completing...' : 'Complete Session'}
        </Button>
      </Box>
    </Paper>
  );
}; 