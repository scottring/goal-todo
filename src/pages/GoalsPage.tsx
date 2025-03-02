import React, { useState, useEffect } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Divider,
  Chip,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DAYS_OF_WEEK } from '../constants';
import type { 
  SourceActivity, 
  RoutineWithoutSystemFields, 
  DayOfWeek, 
  TimeOfDay,
  TaskWithoutSystemFields,
  MilestoneStatus,
  TaskStatus,
  TaskPriority
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { TabPanel } from '../components/TabPanel';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useWeeklyPlanningContext } from '../contexts/WeeklyPlanningContext';
import { TaskReviewList } from '../components/TaskReviewList';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { ShareModal } from '../components/ShareModal';
import { X, Trash2, Edit, Share2, Plus, Target, Clock, CheckCircle, AlertCircle, Calendar, BarChart, Circle } from 'lucide-react';

// Add missing constant
const PRIORITY_OPTIONS: { label: string; value: TaskPriority; icon: React.ReactNode }[] = [
  { label: 'High', value: 'high', icon: <AlertCircle size={16} color="#f44336" /> },
  { label: 'Medium', value: 'medium', icon: <Clock size={16} color="#ff9800" /> },
  { label: 'Low', value: 'low', icon: <CheckCircle size={16} color="#4caf50" /> }
];

const STATUS_OPTIONS: { label: string; value: TaskStatus; icon: React.ReactNode }[] = [
  { label: 'Not Started', value: 'not_started', icon: <Circle size={16} /> },
  { label: 'In Progress', value: 'in_progress', icon: <BarChart size={16} color="#2196f3" /> },
  { label: 'Completed', value: 'completed', icon: <CheckCircle size={16} color="#4caf50" /> }
];

const calculateNextReviewDate = (cycle: ReviewCycle): Timestamp => {
  const now = new Date();
  switch (cycle) {
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
  }
  return Timestamp.fromDate(now);
};

const dateToTimestamp = (dateString: string): Timestamp => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return Timestamp.now();
  }
  return Timestamp.fromDate(date);
};

const timestampToDateString = (timestamp: Timestamp | undefined): string => {
  if (!timestamp || !timestamp.toDate || isNaN(timestamp.toDate().getTime())) {
    return '';
  }
  try {
    return timestamp.toDate().toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting timestamp to date string:', error);
    return '';
  }
};

const EDIT_MODE = {
  WIZARD: 'wizard' as const,
  EDIT: 'edit' as const
} as const;

type EditMode = typeof EDIT_MODE[keyof typeof EDIT_MODE];

interface ReviewStatus {
  lastReviewDate: FirebaseTimestamp;
  nextReviewDate: FirebaseTimestamp;
  completedReviews: string[];
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: FirebaseTimestamp;
}

interface Review {
  reflectionFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  reviewStatus: ReviewStatus;
  adherenceRate: number;
  streakData: StreakData;
}

interface SmartGoalForm {
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  timeTracking: {
    type: TimeTrackingType;
    deadline?: FirebaseTimestamp;
    reviewCycle?: ReviewCycle;
  };
  areaId: string;
  milestones: {
    id: string;
    name: string;
    targetDate?: FirebaseTimestamp;
    successCriteria: string;
    status: TaskStatus;
    tasks: string[];
    routines: string[];
  }[];
  tasks: {
    id: string;
    title: string;
    description?: string;
    dueDate?: FirebaseTimestamp;
    priority: TaskPriority;
    status: TaskStatus;
    completed: boolean;
    assignedTo?: string;
    milestoneId?: string;
  }[];
  routines: {
    id: string;
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    schedule: RoutineSchedule;
    targetCount: number;
    endDate?: FirebaseTimestamp;
    completionDates: FirebaseTimestamp[];
    permissions: {};
    review: Review;
  }[];
}

const createDefaultReview = (): Review => ({
  reflectionFrequency: 'weekly',
  reviewStatus: {
    lastReviewDate: Timestamp.now() as FirebaseTimestamp,
    nextReviewDate: Timestamp.now() as FirebaseTimestamp,
    completedReviews: []
  },
  adherenceRate: 0,
  streakData: {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: Timestamp.now() as FirebaseTimestamp
  }
});

const MEASURABLE_METRIC_OPTIONS: { label: string; value: MeasurableMetric }[] = [
  { label: 'Count occurrences', value: 'count_occurrences' },
  { label: 'Track numeric value', value: 'track_numeric' },
  { label: 'Track time spent', value: 'time_spent' },
  { label: 'Track completion rate (%)', value: 'completion_rate' },
  { label: 'Yes/No completion', value: 'binary_check' },
  { label: 'Custom metric', value: 'custom' }
];

const ACHIEVABILITY_OPTIONS: { label: string; value: AchievabilityCheck }[] = [
  { label: 'Yes, I can achieve this', value: 'yes' },
  { label: 'No, this seems too difficult', value: 'no' },
  { label: 'Need more resources', value: 'need_resources' }
];

const REVIEW_CYCLE_OPTIONS: { label: string; value: ReviewCycle }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Every 6 months', value: 'biannual' },
  { label: 'Yearly', value: 'yearly' }
];

const initialSmartGoal: SmartGoalForm = {
  name: '',
  specificAction: '',
  measurableMetric: 'count_occurrences',
  customMetric: '',
  achievabilityCheck: 'yes',
  relevance: '',
  timeTracking: {
    type: 'fixed_deadline'
  },
  areaId: '',
  milestones: [{
    id: uuidv4(),
    name: '',
    targetDate: Timestamp.fromDate(new Date()),
    successCriteria: '',
    status: 'not_started',
    tasks: [],
    routines: []
  }],
  tasks: [],
  routines: []
};

const addTask = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  tasks: [
    ...smartGoal.tasks,
    {
      id: uuidv4(),
      title: '',
      description: '',
      priority: 'medium' as TaskPriority,
      status: 'not_started' as TaskStatus,
      completed: false,
      dueDate: undefined,
      assignedTo: undefined,
      milestoneId: undefined
    }
  ]
});

const handleTimeChange = (date: Date | null): TimeOfDay => {
  if (!date) {
    return { hour: 9, minute: 0 };
  }
  return {
    hour: date.getHours(),
    minute: date.getMinutes()
  };
};

const addRoutine = (smartGoal: SmartGoalForm): SmartGoalForm => ({
  ...smartGoal,
  routines: [
    ...smartGoal.routines,
    {
      id: uuidv4(),
      title: '',
      description: '',
      frequency: 'weekly' as const,
      schedule: {
        type: 'weekly' as const,
        targetCount: 3,
        timeOfDay: { hour: 9, minute: 0 },
        daysOfWeek: [
          { day: 'monday' as DayOfWeek, time: { hour: 9, minute: 0 } },
          { day: 'wednesday' as DayOfWeek, time: { hour: 9, minute: 0 } },
          { day: 'friday' as DayOfWeek, time: { hour: 9, minute: 0 } }
        ],
        dayOfMonth: undefined,
        monthsOfYear: []
      } as RoutineSchedule,
      targetCount: 3,
      completionDates: [],
      permissions: {},
      review: createDefaultReview()
    }
  ]
});

const addMilestone = (smartGoal: SmartGoalForm) => {
  const defaultName = 'New Milestone';
  let uniqueName = defaultName;
  let counter = 1;
  
  // Find a unique name
  while (smartGoal.milestones.some(m => m.name.trim().toLowerCase() === uniqueName.trim().toLowerCase())) {
    uniqueName = `${defaultName} ${counter}`;
    counter++;
  }

  return {
    ...smartGoal,
    milestones: [
      ...smartGoal.milestones,
      {
        id: uuidv4(),
        name: uniqueName,
        targetDate: Timestamp.fromDate(new Date()),
        successCriteria: '',
        status: 'not_started' as TaskStatus,
        tasks: [],
        routines: []
      }
    ]
  };
};

const addTaskToMilestone = (smartGoal: SmartGoalForm, milestoneIndex: number) => {
  const milestone = smartGoal.milestones[milestoneIndex];
  const newTask = {
    id: uuidv4(),
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus,
    completed: false,
    dueDate: undefined,
    assignedTo: undefined,
    milestoneId: milestone.id
  };

  const newMilestones = [...smartGoal.milestones];
  newMilestones[milestoneIndex] = {
    ...newMilestones[milestoneIndex],
    tasks: [...newMilestones[milestoneIndex].tasks, newTask.id]
  };

  return {
    ...smartGoal,
    milestones: newMilestones,
    tasks: [...smartGoal.tasks, newTask]
  };
};

const addRoutineToMilestone = (smartGoal: SmartGoalForm, milestoneIndex: number) => {
  const newRoutine = {
    id: uuidv4(),
    title: '',
    description: '',
    frequency: 'daily' as const,
    schedule: {
      type: 'daily' as const,
      targetCount: 1,
      timeOfDay: { hour: 9, minute: 0 },
      daysOfWeek: [],
      dayOfMonth: undefined,
      monthsOfYear: []
    },
    targetCount: 1,
    completionDates: [],
    permissions: {},
    review: createDefaultReview()
  };

  const newMilestones = [...smartGoal.milestones];
  newMilestones[milestoneIndex] = {
    ...newMilestones[milestoneIndex],
    routines: [...newMilestones[milestoneIndex].routines, newRoutine.id]
  };

  return {
    ...smartGoal,
    milestones: newMilestones,
    routines: [...smartGoal.routines, newRoutine]
  };
};

interface CleanableObject {
  [key: string]: unknown;
}

const isObject = (value: unknown): value is CleanableObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const removeUndefinedFields = <T extends CleanableObject>(obj: T): T => {
  const cleanObj = {} as T;
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    
    if (Array.isArray(value)) {
      cleanObj[key as keyof T] = value.map(item => 
        isObject(item) ? removeUndefinedFields(item) : item
      ) as T[keyof T];
    } else if (isObject(value)) {
      const cleaned = removeUndefinedFields(value);
      if (Object.keys(cleaned).length > 0) {
        cleanObj[key as keyof T] = cleaned as T[keyof T];
      }
    } else {
      cleanObj[key as keyof T] = value as T[keyof T];
    }
  });
  
  return cleanObj;
};

type TaskAction = 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

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

  const handleTaskAction = async (taskId: string, action: TaskAction) => {
    const task = currentSession?.reviewPhase?.taskReviews?.find((t: any) => t.taskId === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    const reviewData: TaskReviewItemType = {
      taskId,
      title: task.title || 'Untitled Task',
      status: action === 'mark_completed' ? 'completed' : 
             action === 'mark_missed' ? 'missed' : 
             'needs_review',
      originalDueDate: task.originalDueDate instanceof Timestamp ? 
                      task.originalDueDate : 
                      Timestamp.fromDate(new Date()),
      action,
      priority: task.priority || 'medium'
    };

    await updateTaskReview(reviewData);
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
          tasks={currentSession?.reviewPhase.taskReviews || [] as any}
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
              onDelete={handleDelete}
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

const GoalsPage: React.FC = () => {
  const location = useLocation();
  const { areas } = useAreasContext();
  const { goals, createGoal, updateGoal, deleteGoal } = useGoalsContext();
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(EDIT_MODE.WIZARD);
  const [smartGoal, setSmartGoal] = useState<SmartGoalForm>(initialSmartGoal);
  const [submitting, setSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingGoal, setSharingGoal] = useState<SourceActivity | null>(null);
  const navigate = useNavigate();
  const [taskTitleUpdates, setTaskTitleUpdates] = useState<{[key: string]: string}>({});
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [taskTitleError, setTaskTitleError] = useState<{[key: string]: string}>({});
  const [openRoutineModal, setOpenRoutineModal] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{index: number, milestone: SmartGoalForm['milestones'][0]} | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    targetDate: Timestamp.fromDate(new Date()),
    successCriteria: '',
    status: 'not_started'
  });
  // State for task/habit tabs in the Supporting Habits step
  const [taskHabitTab, setTaskHabitTab] = useState(0);

  // Handle navigation state
  useEffect(() => {
    const state = location.state as { editingGoal?: SourceActivity; preselectedAreaId?: string } | null;
    
    if (state?.editingGoal) {
      handleEdit(state.editingGoal);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    } else if (state?.preselectedAreaId && typeof state.preselectedAreaId === 'string') {
      const areaId: string = state.preselectedAreaId;
      setSmartGoal(prev => ({ ...prev, areaId }));
      setIsAdding(true);
      setCurrentStep(0);
      setEditMode(EDIT_MODE.WIZARD);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    
    try {
      if (!smartGoal.areaId) {
        throw new Error('Please select an area for this goal');
      }

      if (!smartGoal.name.trim()) {
        throw new Error('Please enter a goal name');
      }

      const goalData: Omit<SourceActivity, keyof BaseDocument> = {
        name: smartGoal.name.trim(),
        specificAction: smartGoal.specificAction.trim(),
        measurableMetric: smartGoal.measurableMetric,
        customMetric: smartGoal.customMetric?.trim(),
        achievabilityCheck: smartGoal.achievabilityCheck,
        relevance: smartGoal.relevance.trim(),
        timeTracking: {
          type: smartGoal.timeTracking.type,
          ...(smartGoal.timeTracking.type === 'fixed_deadline' 
            ? { deadline: smartGoal.timeTracking.deadline }
            : {
                reviewCycle: smartGoal.timeTracking.reviewCycle || 'monthly',
                nextReviewDate: smartGoal.timeTracking.reviewCycle 
                  ? calculateNextReviewDate(smartGoal.timeTracking.reviewCycle)
                  : Timestamp.now()
              }
          )
        },
        milestones: smartGoal.milestones.map(m => ({
          id: m.id || uuidv4(),
          name: m.name.trim(),
          targetDate: m.targetDate || Timestamp.fromDate(new Date()),
          successCriteria: m.successCriteria.trim(),
          status: m.status,
          tasks: m.tasks || [],
          routines: m.routines || []
        })),
        areaId: smartGoal.areaId,
        sharedWith: [],
        tasks: smartGoal.tasks.map(task => ({
          id: task.id || uuidv4(),
          ownerId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          title: task.title.trim(),
          description: task.description?.trim() || '',
          dueDate: task.dueDate || undefined,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
          assignedTo: task.assignedTo,
          sharedWith: [],
          permissions: {}
        })),
        routines: smartGoal.routines.map(routine => ({
          id: 'id' in routine && routine.id ? routine.id : uuidv4(),
          title: routine.title.trim(),
          description: routine.description?.trim() || '',
          frequency: routine.frequency,
          schedule: {
            type: routine.frequency,
            targetCount: routine.targetCount || 1,
            timeOfDay: routine.schedule?.timeOfDay || { hour: 9, minute: 0 },
            daysOfWeek: routine.schedule?.daysOfWeek || [],
            dayOfMonth: routine.schedule?.dayOfMonth,
            monthsOfYear: routine.schedule?.monthsOfYear || []
          },
          targetCount: routine.targetCount || 1,
          endDate: routine.endDate,
          completionDates: routine.completionDates || [],
          ownerId: currentUser?.uid || '',
          permissions: {},
          review: createDefaultReview()
        }))
      };

      // Since we've already handled all optional fields above, we can safely cast the cleaned data
      const cleanedGoalData = removeUndefinedFields(goalData) as typeof goalData;

      if (editingGoal) {
        await updateGoal(editingGoal, cleanedGoalData);
        toast.success('Goal updated successfully!');
      } else {
        await createGoal(cleanedGoalData);
        toast.success('Goal created successfully!');
      }
      
      setSmartGoal(initialSmartGoal);
      setIsAdding(false);
      setCurrentStep(0);
      setEditingGoal(null);
      setEditMode(EDIT_MODE.WIZARD);
    } catch (error) {
      console.error('Error submitting goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (goal: SourceActivity) => {
    setEditingGoal(goal.id);
    setIsAdding(true);
    setEditMode(EDIT_MODE.EDIT);
    setSmartGoal({
      name: goal.name,
      specificAction: goal.specificAction || '',
      measurableMetric: goal.measurableMetric,
      customMetric: goal.customMetric,
      achievabilityCheck: goal.achievabilityCheck,
      relevance: goal.relevance || '',
      timeTracking: {
        type: goal.timeTracking.type,
        deadline: goal.timeTracking.deadline as FirebaseTimestamp | undefined,
        reviewCycle: goal.timeTracking.reviewCycle
      },
      areaId: goal.areaId,
      milestones: goal.milestones.map(m => ({
        id: m.id,
        name: m.name,
        targetDate: m.targetDate as FirebaseTimestamp | undefined,
        successCriteria: m.successCriteria || '',
        status: m.status,
        tasks: m.tasks || [],
        routines: m.routines || []
      })),
      tasks: goal.tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        dueDate: t.dueDate as FirebaseTimestamp | undefined,
        priority: t.priority,
        status: t.status,
        completed: t.completed,
        milestoneId: t.milestoneId
      })),
      routines: goal.routines.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        frequency: r.frequency,
        schedule: r.schedule,
        targetCount: r.targetCount,
        endDate: r.endDate as FirebaseTimestamp | undefined,
        completionDates: (r.completionDates || []) as FirebaseTimestamp[],
        permissions: r.permissions || {},
        review: createDefaultReview()
      }))
    });
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  const handleDateChange = (value: string | undefined): Timestamp | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : Timestamp.fromDate(date);
  };

  const handleTaskChange = (index: number, field: keyof SmartGoalForm['tasks'][0], value: any) => {
    setSmartGoal(prev => {
      const newTasks = [...prev.tasks];
      newTasks[index] = {
        ...newTasks[index],
        [field]: field === 'dueDate' 
          ? (value instanceof Date ? Timestamp.fromDate(value) : (value === null ? undefined : value))
          : value,
        completed: field === 'status' ? value === 'completed' : newTasks[index].completed
      };
      return { ...prev, tasks: newTasks };
    });
  };

  const handleMilestoneChange = (index: number, field: keyof SmartGoalForm['milestones'][0], value: any) => {
    setSmartGoal(prev => {
      // For name changes, check for duplicates
      if (field === 'name' && typeof value === 'string') {
        const trimmedValue = value.trim();
        const isDuplicateName = prev.milestones.some((m, i) => 
          i !== index && m.name.trim().toLowerCase() === trimmedValue.toLowerCase()
        );
        
        if (isDuplicateName) {
          toast.error('A milestone with this name already exists');
          return prev; // Return unchanged state
        }
      }
      
      const newMilestones = [...prev.milestones];
      newMilestones[index] = {
        ...newMilestones[index],
        [field]: field === 'targetDate'
          ? (value instanceof Date ? Timestamp.fromDate(value) : (value === null ? undefined : value))
          : value
      };
      
      return { ...prev, milestones: newMilestones };
    });
  };

  const handleShareClick = (goal: SourceActivity) => {
    setSharingGoal(goal);
    setIsShareModalOpen(true);
  };

  const handleCardClick = (goalId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((event.target as HTMLElement).closest('.action-buttons')) {
      return;
    }
    navigate(`/goals/${goalId}`);
  };

  const renderAreaStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Area
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose the area of your life this goal belongs to
      </Typography>

      <FormControl fullWidth required>
        <InputLabel>Area</InputLabel>
        <Select
          value={smartGoal.areaId}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, areaId: e.target.value }))}
          label="Area"
        >
          {areas.map(area => (
            <MenuItem key={area.id} value={area.id}>
              {area.name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          Areas help you organize and track related goals together
        </FormHelperText>
      </FormControl>
    </Box>
  );

  const renderSpecificStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Make it Specific
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define your goal with clear, specific details
        </Typography>
      </Box>

      <TextField
        label="Goal Name"
        value={smartGoal.name}
        onChange={(e) => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
        fullWidth
        required
        helperText="Give your goal a clear, memorable name"
      />

      <TextField
        label="Specific Action"
        value={smartGoal.specificAction}
        onChange={(e) => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
        fullWidth
        required
        multiline
        rows={3}
        helperText="What exactly do you want to accomplish? Be as specific as possible"
      />
    </Stack>
  );

  const renderMeasurableStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Make it Measurable
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define how you'll measure progress towards this goal
        </Typography>
      </Box>

      <FormControl fullWidth required>
        <InputLabel>Measurement Type</InputLabel>
        <Select
          select
          label="How will you measure success?"
          value={smartGoal.measurableMetric}
          onChange={(e) => {
            const value = e.target.value as MeasurableMetric;
            setSmartGoal(prev => ({
              ...prev,
              measurableMetric: value,
              customMetric: value === 'custom' ? prev.customMetric : undefined
            }));
          }}
          fullWidth
          required
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        >
          {MEASURABLE_METRIC_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          How will you track progress towards this goal?
        </FormHelperText>
      </FormControl>

      {smartGoal.measurableMetric === 'custom' && (
        <TextField
          label="Custom Metric"
          value={smartGoal.customMetric || ''}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))}
          fullWidth
          required
          helperText="Define your custom way of measuring progress"
        />
      )}
    </Stack>
  );

  const renderAchievableStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Is this goal achievable with your current resources?
        </label>
        <select
          value={smartGoal.achievabilityCheck}
          onChange={e => setSmartGoal(prev => ({ ...prev, achievabilityCheck: e.target.value as AchievabilityCheck }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          required
        >
          {ACHIEVABILITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderRelevantStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Why is this goal important to you?
        </label>
        <textarea
          value={smartGoal.relevance}
          onChange={e => setSmartGoal(prev => ({ ...prev, relevance: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          placeholder="How does this goal align with your values and long-term objectives?"
          rows={3}
          required
        />
      </div>
      <p className="text-sm text-gray-500 italic">Example: Improve health and maintain work-life balance</p>
    </div>
  );

  const renderTimeboundStep = (): JSX.Element => (
    <Box sx={{ 
      borderRadius: 2, 
      p: 3, 
      backgroundColor: 'background.paper',
      boxShadow: 1
    }}>
      <Stack spacing={3}>
        {/* Fun header with emoji */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="img" aria-label="clock" style={{ fontSize: '2rem', marginRight: '0.5rem' }}>⏱️</span> 
            Set Your Timeline
          </Typography>
          <Typography variant="body1" color="text.secondary">
            When will you achieve this goal? Set a clear deadline or review schedule
          </Typography>
        </Box>

        <Paper elevation={2} sx={{ p: 3, borderRadius: '16px' }}>
          <FormControl fullWidth>
            <InputLabel>Tracking Type</InputLabel>
            <Select
              value={smartGoal.timeTracking.type}
              onChange={(e) => setSmartGoal(prev => ({
                ...prev,
                timeTracking: {
                  ...prev.timeTracking,
                  type: e.target.value as TimeTrackingType
                }
              }))}
              label="Tracking Type"
              sx={{ mb: 2 }}
            >
              <MenuItem value="fixed_deadline">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span role="img" aria-label="target" style={{ marginRight: '8px' }}>🎯</span>
                  Fixed Deadline
                </Box>
              </MenuItem>
              <MenuItem value="recurring_review">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span role="img" aria-label="recurring" style={{ marginRight: '8px' }}>🔄</span>
                  Recurring Review
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {smartGoal.timeTracking.type === 'fixed_deadline' ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Deadline"
                value={smartGoal.timeTracking.deadline instanceof Timestamp ? smartGoal.timeTracking.deadline.toDate() : null}
                onChange={(date) => setSmartGoal(prev => ({
                  ...prev,
                  timeTracking: {
                    ...prev.timeTracking,
                    deadline: date ? Timestamp.fromDate(date) : undefined
                  }
                }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'When do you want to achieve this goal by?'
                  }
                }}
              />
            </LocalizationProvider>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Review Cycle</InputLabel>
              <Select
                value={smartGoal.timeTracking.reviewCycle || ''}
                onChange={(e) => setSmartGoal(prev => ({
                  ...prev,
                  timeTracking: {
                    ...prev.timeTracking,
                    reviewCycle: e.target.value as ReviewCycle,
                    nextReviewDate: calculateNextReviewDate(e.target.value as ReviewCycle)
                  }
                }))}
                label="Review Cycle"
              >
                {REVIEW_CYCLE_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span role="img" aria-label="cycle" style={{ marginRight: '8px' }}>
                        {option.value === 'weekly' ? '🗓️' : 
                        option.value === 'monthly' ? '📅' : 
                        option.value === 'quarterly' ? '🗂️' : 
                        option.value === 'biannual' ? '📊' : '📆'}
                      </span>
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                How often do you want to review your progress?
              </FormHelperText>
            </FormControl>
          )}
        </Paper>
      </Stack>
    </Box>
  );

  const renderMilestonesStep = (): JSX.Element => (
    <Stack spacing={3}>
      {smartGoal.milestones.map((milestone, index) => (
        <Paper key={milestone.id} sx={{ p: 3, position: 'relative' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" gutterBottom>
              Milestone {index + 1}
            </Typography>
            <Box>
              <IconButton
                size="small"
                onClick={() => handleMilestoneEdit(index, milestone)}
                sx={{ mr: 1 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              {index > 0 && (
                <IconButton
                  size="small"
                  onClick={() => {
                    const newMilestones = smartGoal.milestones.filter((_, i) => i !== index);
                    setSmartGoal(prev => ({ ...prev, milestones: newMilestones }));
                  }}
                  color="error"
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={milestone.name}
              onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
              fullWidth
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Target Date"
                value={milestone.targetDate instanceof Timestamp ? milestone.targetDate.toDate() : null}
                onChange={(date) => handleMilestoneChange(index, 'targetDate', date ? Timestamp.fromDate(date) : undefined)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
            <TextField
              label="Success Criteria"
              value={milestone.successCriteria}
              onChange={(e) => handleMilestoneChange(index, 'successCriteria', e.target.value)}
              multiline
              rows={2}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={milestone.status}
                onChange={(e) => handleMilestoneChange(index, 'status', e.target.value)}
                label="Status"
              >
                {STATUS_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tasks Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tasks
              </Typography>
              <Stack spacing={2}>
                {milestone.tasks.map((taskId) => {
                  const task = smartGoal.tasks.find(t => t.id === taskId);
                  if (!task) return null;

                  return (
                    <Box key={taskId} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Task</Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newMilestones = [...smartGoal.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              tasks: milestone.tasks.filter(id => id !== taskId)
                            };
                            setSmartGoal(prev => ({
                              ...prev,
                              milestones: newMilestones,
                              tasks: prev.tasks.filter(t => t.id !== taskId)
                            }));
                            setTaskTitleError(prev => {
                              const { [taskId]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={2}>
                        <TextField
                          label="Title"
                          value={taskTitleUpdates[taskId] ?? task.title}
                          onChange={(e) => {
                            setTaskTitleUpdates(prev => ({
                              ...prev,
                              [taskId]: e.target.value
                            }));
                            // Clear error when user starts typing
                            setTaskTitleError(prev => {
                              const { [taskId]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          onBlur={() => {
                            if (taskTitleUpdates[taskId] === undefined) return;
                            setUpdatingTaskId(taskId);
                            const newTitle = taskTitleUpdates[taskId];
                            
                            // Check if this title already exists in any milestone's tasks
                            const titleExists = smartGoal.milestones.some(m => 
                              m.tasks.some(tid => {
                                const t = smartGoal.tasks.find(task => task.id === tid);
                                return t && t.id !== taskId && t.title === newTitle;
                              })
                            );

                            if (titleExists) {
                              // If title exists, don't update and show error
                              setTaskTitleError(prev => ({
                                ...prev,
                                [taskId]: 'A task with this name already exists in a milestone'
                              }));
                              setTaskTitleUpdates(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                            } else {
                              // If title doesn't exist, proceed with the update
                              setSmartGoal(prev => ({
                                ...prev,
                                tasks: prev.tasks.map(t => 
                                  t.id === taskId ? { ...t, title: newTitle } : t
                                )
                              }));
                              setTaskTitleUpdates(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                              setTaskTitleError(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                            setUpdatingTaskId(null);
                          }}
                          sx={{ width: '100%' }}
                          disabled={updatingTaskId === taskId}
                          error={!!taskTitleError[taskId]}
                          helperText={taskTitleError[taskId]}
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Due Date"
                            value={task.dueDate?.toDate() || null}
                            onChange={(date) => {
                              setSmartGoal(prev => ({
                                ...prev,
                                tasks: prev.tasks.map(t => 
                                  t.id === taskId ? { ...t, dueDate: date ? Timestamp.fromDate(date) : undefined } : t
                                )
                              }));
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small"
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Stack>
                    </Box>
                  );
                })}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newTask = {
                      id: uuidv4(),
                      title: '',
                      description: '',
                      dueDate: undefined,
                      priority: 'medium' as TaskPriority,
                      status: 'not_started' as TaskStatus,
                      completed: false
                    };
                    
                    setSmartGoal(prev => {
                      const newTasks = [...prev.tasks, newTask];
                      const newMilestones = [...prev.milestones];
                      newMilestones[index] = {
                        ...newMilestones[index],
                        tasks: [...newMilestones[index].tasks, newTask.id]
                      };
                      
                      return {
                        ...prev,
                        tasks: newTasks,
                        milestones: newMilestones
                      };
                    });
                  }}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  Add Task
                </Button>
              </Stack>
            </Box>

            {/* Routines Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Routines
              </Typography>
              <Stack spacing={2}>
                {milestone.routines.map((routineId) => {
                  const routine = smartGoal.routines.find(r => r.id === routineId);
                  if (!routine) return null;

                  return (
                    <Box key={routineId} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Routine</Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newMilestones = [...smartGoal.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              routines: milestone.routines.filter(id => id !== routineId)
                            };
                            setSmartGoal(prev => ({
                              ...prev,
                              milestones: newMilestones,
                              routines: prev.routines.filter(r => r.id !== routineId)
                            }));
                          }}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={2}>
                        <TextField
                          label="Title"
                          value={routine.title}
                          onChange={(e) => {
                            setSmartGoal(prev => ({
                              ...prev,
                              routines: prev.routines.map(r => 
                                r.id === routineId ? { ...r, title: e.target.value } : r
                              )
                            }));
                          }}
                          fullWidth
                          size="small"
                        />
                        <TextField
                          label="Description"
                          value={routine.description || ''}
                          onChange={(e) => {
                            setSmartGoal(prev => ({
                              ...prev,
                              routines: prev.routines.map(r => 
                                r.id === routineId ? { ...r, description: e.target.value } : r
                              )
                            }));
                          }}
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Frequency</InputLabel>
                          <Select
                            value={routine.frequency}
                            onChange={(e) => {
                              const frequency = e.target.value as typeof routine.frequency;
                              setSmartGoal(prev => ({
                                ...prev,
                                routines: prev.routines.map(r => 
                                  r.id === routineId ? {
                                    ...r,
                                    frequency,
                                    schedule: {
                                      ...r.schedule,
                                      type: frequency
                                    }
                                  } : r
                                )
                              }));
                            }}
                            label="Frequency"
                          >
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="quarterly">Quarterly</MenuItem>
                            <MenuItem value="yearly">Yearly</MenuItem>
                          </Select>
                        </FormControl>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setOpenRoutineModal(`${milestone.id}-${routineId}`)}
                        >
                          Edit Schedule & Details
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newRoutine = {
                      id: uuidv4(),
                      title: '',
                      description: '',
                      frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
                      schedule: { daysOfWeek: [] },
                      targetCount: 1,
                      completionDates: [],
                      permissions: {},
                      review: createDefaultReview()
                    };
                    
                    setSmartGoal(prev => {
                      const newRoutines = [...prev.routines, newRoutine];
                      const newMilestones = [...prev.milestones];
                      newMilestones[index] = {
                        ...newMilestones[index],
                        routines: [...newMilestones[index].routines, newRoutine.id]
                      };
                      
                      return {
                        ...prev,
                        routines: newRoutines,
                        milestones: newMilestones
                      };
                    });
                  }}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  Add Habit/Routine
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setSmartGoal(prev => addMilestone(prev))}
      >
        {editMode === EDIT_MODE.EDIT ? 'Add New Milestone' : 'Add Milestone'}
      </Button>
    </Stack>
  );

  const renderTasksStep = () => {
    // Filter tasks to only show those not in milestones
    const independentTasks = smartGoal.tasks.filter(task => !task.milestoneId);

    return (
      <Stack spacing={3}>
        {independentTasks.map((task, index) => (
          <Box key={index}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Task {index + 1}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  const newTasks = smartGoal.tasks.filter(t => t.id !== task.id);
                  setSmartGoal(prev => ({ ...prev, tasks: newTasks }));
                }}
                color="error"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Title"
                value={task.title}
                onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                fullWidth
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={task.dueDate?.toDate() || null}
                  onChange={(date) => handleTaskChange(index, 'dueDate', date ? Timestamp.fromDate(date) : undefined)}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Stack>
          </Box>
        ))}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setSmartGoal(prev => addTask(prev))}
        >
          {editMode === EDIT_MODE.EDIT ? 'Add New Task' : 'Add Task'}
        </Button>
      </Stack>
    );
  };

  const renderRoutinesStep = () => (
    <Stack spacing={3}>
      {smartGoal.routines.map((routine, index) => (
        <Paper key={index} sx={{ p: 3, position: 'relative' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Routine {index + 1}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                const newRoutines = smartGoal.routines.filter((_, i) => i !== index);
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              color="error"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={routine.title}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                newRoutines[index] = { ...routine, title: e.target.value };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
            />
            <TextField
              label="Description"
              value={routine.description || ''}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                newRoutines[index] = { ...routine, description: e.target.value };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={routine.frequency}
                onChange={(e) => {
                  const newRoutines = [...smartGoal.routines];
                  const frequency = e.target.value as typeof routine.frequency;
                  newRoutines[index] = {
                    ...routine,
                    frequency,
                    schedule: {
                      ...routine.schedule,
                      type: frequency
                    }
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                label="Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Target Count"
              type="number"
              value={routine.targetCount}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                const targetCount = parseInt(e.target.value) || 1;
                newRoutines[index] = {
                  ...routine,
                  targetCount,
                  schedule: {
                    ...routine.schedule,
                    targetCount,
                    daysOfWeek: Array(targetCount).fill(null).map((_, i) => 
                      routine.schedule.daysOfWeek?.[i] || {
                        day: 'monday',
                        time: { hour: 9, minute: 0 }
                      }
                    )
                  }
                };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
              InputProps={{ inputProps: { min: 1 } }}
            />

            {routine.frequency === 'weekly' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Schedule for {routine.targetCount} days per week
                </Typography>
                <Stack spacing={2}>
                  {Array.from({ length: routine.targetCount }).map((_, dayIndex) => {
                    const currentSchedule = routine.schedule.daysOfWeek?.[dayIndex];
                    return (
                      <Box key={dayIndex} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Day</InputLabel>
                            <Select
                              value={currentSchedule?.day || 'monday'}
                              onChange={(e) => {
                                const newRoutines = [...smartGoal.routines];
                                const newDaysOfWeek = [...(routine.schedule.daysOfWeek || [])];
                                newDaysOfWeek[dayIndex] = {
                                  ...newDaysOfWeek[dayIndex],
                                  day: e.target.value as DayOfWeek,
                                  time: currentSchedule?.time || { hour: 9, minute: 0 }
                                };
                                newRoutines[index] = {
                                  ...routine,
                                  schedule: {
                                    ...routine.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                              }}
                              label="Day"
                            >
                              {DAYS_OF_WEEK.map((day: string) => (
                                <MenuItem key={day} value={day.toLowerCase()}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <TimePicker
                              label="Time"
                              value={new Date().setHours(
                                currentSchedule?.time?.hour || 9,
                                currentSchedule?.time?.minute || 0
                              )}
                              onChange={(newDate) => {
                                if (!newDate) return;
                                const timeOfDay = handleTimeChange(new Date(newDate));
                                const newRoutines = [...smartGoal.routines];
                                const newDaysOfWeek = [...(routine.schedule.daysOfWeek || [])];
                                newDaysOfWeek[dayIndex] = {
                                  ...newDaysOfWeek[dayIndex],
                                  day: currentSchedule?.day || 'monday',
                                  time: timeOfDay
                                };
                                newRoutines[index] = {
                                  ...routine,
                                  schedule: {
                                    ...routine.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                              }}
                            />
                          </LocalizationProvider>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {(routine.frequency === 'daily' || routine.frequency === 'monthly') && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Time of Day"
                  value={new Date().setHours(
                    routine.schedule.timeOfDay?.hour || 9,
                    routine.schedule.timeOfDay?.minute || 0
                  )}
                  onChange={(newDate) => {
                    if (!newDate) return;
                    const timeOfDay = handleTimeChange(new Date(newDate));
                    const newRoutines = [...smartGoal.routines];
                    newRoutines[index] = {
                      ...routine,
                      schedule: {
                        ...routine.schedule,
                        timeOfDay
                      }
                    };
                    setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                  }}
                />
              </LocalizationProvider>
            )}

            {routine.frequency === 'monthly' && (
              <TextField
                label="Day of Month"
                type="number"
                value={routine.schedule.dayOfMonth || ''}
                onChange={(e) => {
                  const newRoutines = [...smartGoal.routines];
                  newRoutines[index] = {
                    ...routine,
                    schedule: {
                      ...routine.schedule,
                      dayOfMonth: parseInt(e.target.value)
                    }
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 31 } }}
              />
            )}

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date (Optional)"
                value={routine.endDate?.toDate() || null}
                onChange={(date) => {
                  const newRoutines = [...smartGoal.routines];
                  newRoutines[index] = {
                    ...routine,
                    endDate: date ? Timestamp.fromDate(date) : undefined
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Stack>
        </Paper>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setSmartGoal(prev => addRoutine(prev))}
      >
        {editMode === EDIT_MODE.EDIT ? 'Add New Routine' : 'Add Routine'}
      </Button>
    </Stack>
  );

  const renderReviewStep = () => (
    <Box sx={{ 
      borderRadius: 2, 
      p: 3, 
      backgroundColor: 'background.paper',
      boxShadow: 1
    }}>
      <Stack spacing={4}>
        {/* Fun header with emoji */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="img" aria-label="check" style={{ fontSize: '2rem', marginRight: '0.5rem' }}>✅</span> 
            Review Your Goal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Double-check everything before finalizing your SMART goal
          </Typography>
        </Box>
        
        <Paper elevation={3} sx={{ p: 3, borderRadius: '16px' }}>
          <Stack spacing={3}>
            {/* Goal name section */}
            <Box sx={{ 
              p: 2, 
              borderRadius: '12px',
              backgroundColor: 'primary.light',
              color: 'primary.contrastText'
            }}>
              <Typography variant="h5" gutterBottom align="center">
                {smartGoal.name || 'Untitled Goal'}
              </Typography>
              <Typography variant="body1" align="center">
                in {smartGoal.areaId ? 
                  areas.find(a => a.id === smartGoal.areaId)?.name || 'Unknown Area' : 
                  'No Area Selected'}
              </Typography>
            </Box>
            
            {/* Goal details */}
            <Grid container spacing={3}>
              {/* Specific */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <span role="img" aria-label="target" style={{ marginRight: '8px', fontSize: '1.2rem' }}>🎯</span>
                    <Typography variant="subtitle1" fontWeight="bold">Specific Action</Typography>
                  </Box>
                  <Typography variant="body1">{smartGoal.specificAction}</Typography>
                </Paper>
              </Grid>
              
              {/* Measurable */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <span role="img" aria-label="ruler" style={{ marginRight: '8px', fontSize: '1.2rem' }}>📏</span>
                    <Typography variant="subtitle1" fontWeight="bold">Measurable Metric</Typography>
                  </Box>
                  <Typography variant="body1">
                    {MEASURABLE_METRIC_OPTIONS.find(opt => opt.value === smartGoal.measurableMetric)?.label}
                    {smartGoal.measurableMetric === 'custom' && smartGoal.customMetric && (
                      <Box sx={{ mt: 1, fontSize: '0.9rem', color: 'text.secondary' }}>
                        Custom metric: {smartGoal.customMetric}
                      </Box>
                    )}
                  </Typography>
                </Paper>
              </Grid>
              
              {/* Achievable */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <span role="img" aria-label="check" style={{ marginRight: '8px', fontSize: '1.2rem' }}>✓</span>
                    <Typography variant="subtitle1" fontWeight="bold">Achievability</Typography>
                  </Box>
                  <Typography variant="body1">
                    {ACHIEVABILITY_OPTIONS.find(opt => opt.value === smartGoal.achievabilityCheck)?.label}
                  </Typography>
                </Paper>
              </Grid>
              
              {/* Relevant */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <span role="img" aria-label="compass" style={{ marginRight: '8px', fontSize: '1.2rem' }}>🧭</span>
                    <Typography variant="subtitle1" fontWeight="bold">Relevance</Typography>
                  </Box>
                  <Typography variant="body1">{smartGoal.relevance}</Typography>
                </Paper>
              </Grid>
              
              {/* Time-bound */}
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ 
                  p: 2, 
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <span role="img" aria-label="clock" style={{ marginRight: '8px', fontSize: '1.2rem' }}>⏱️</span>
                    <Typography variant="subtitle1" fontWeight="bold">Time-bound</Typography>
                  </Box>
                  <Typography variant="body1">
                    {smartGoal.timeTracking.type === 'fixed_deadline' 
                      ? (smartGoal.timeTracking.deadline 
                          ? `Deadline: ${timestampToDateString(smartGoal.timeTracking.deadline)}` 
                          : 'No deadline set') 
                      : `Review cycle: ${REVIEW_CYCLE_OPTIONS.find(opt => opt.value === smartGoal.timeTracking.reviewCycle)?.label || 'None'}`}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {/* Milestones */}
            {smartGoal.milestones.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <span role="img" aria-label="ladder" style={{ marginRight: '8px', fontSize: '1.2rem' }}>🪜</span>
                  Milestones ({smartGoal.milestones.length})
                </Typography>
                <Stack spacing={2}>
                  {smartGoal.milestones.map((milestone, index) => (
                    <Paper 
                      key={milestone.id} 
                      elevation={1}
                      sx={{ 
                        p: 2, 
                        borderRadius: '12px',
                        borderLeft: '4px solid',
                        borderColor: milestone.status === 'completed' 
                          ? 'success.main' 
                          : milestone.status === 'in_progress' 
                          ? 'info.main' 
                          : 'grey.400'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {index + 1}. {milestone.name}
                        </Typography>
                        <Chip 
                          label={STATUS_OPTIONS.find(opt => opt.value === milestone.status)?.label}
                          size="small"
                          color={
                            milestone.status === 'completed' 
                              ? 'success' 
                              : milestone.status === 'in_progress' 
                              ? 'primary' 
                              : 'default'
                          }
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {milestone.targetDate && (
                          <Chip 
                            icon={<span role="img" aria-label="calendar" style={{ fontSize: '0.9rem' }}>📅</span>}
                            label={timestampToDateString(milestone.targetDate)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {milestone.tasks.length > 0 && (
                          <Chip 
                            icon={<span role="img" aria-label="tasks" style={{ fontSize: '0.9rem' }}>📝</span>}
                            label={`${milestone.tasks.length} tasks`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {milestone.routines.length > 0 && (
                          <Chip 
                            icon={<span role="img" aria-label="habits" style={{ fontSize: '0.9rem' }}>🔄</span>}
                            label={`${milestone.routines.length} habits`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );

  // Define these functions before declaring wizardSteps
  // NEW COMBINED STEP: Goal Setup (combines Area, Specific, Measurable)
  const renderGoalSetupStep = () => (
    <Box sx={{ 
      borderRadius: 2, 
      p: 3, 
      backgroundColor: 'background.paper',
      boxShadow: 1,
      transition: 'all 0.3s ease'
    }}>
      <Stack spacing={4}>
        {/* Fun header with emoji */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="img" aria-label="goal" style={{ fontSize: '2rem', marginRight: '0.5rem' }}>🎯</span> 
            Define Your Goal
          </Typography>
        </Box>

        {/* Area Selection with visual cards */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Area
          </Typography>
          <Grid container spacing={2}>
            {areas.map(area => (
              <Grid item xs={6} sm={4} md={3} key={area.id}>
                <Card 
                  onClick={() => setSmartGoal(prev => ({ ...prev, areaId: area.id }))}
                  sx={{ 
                    cursor: 'pointer', 
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    bgcolor: smartGoal.areaId === area.id ? 'primary.light' : 'background.paper',
                    border: smartGoal.areaId === area.id ? '2px solid' : '1px solid',
                    borderColor: smartGoal.areaId === area.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3
                    }
                  }}
                >
                  <Typography variant="subtitle1" align="center">{area.name}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Goal Name with emoji decoration */}
        <TextField
          label="Goal Name"
          value={smartGoal.name}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
          fullWidth
          required
          InputProps={{
            startAdornment: <span role="img" aria-label="star" style={{ marginRight: '8px' }}>⭐</span>
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />

        {/* Specific Action with visual enhancement */}
        <TextField
          label="What exactly will you accomplish?"
          value={smartGoal.specificAction}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
          fullWidth
          required
          multiline
          rows={3}
          InputProps={{
            startAdornment: <span role="img" aria-label="bullseye" style={{ marginRight: '8px', alignSelf: 'flex-start', marginTop: '8px' }}>🎯</span>
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />

        {/* Measurement Type with visual indicators */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            Measurements
          </Typography>
        </Box>
        
        <TextField
          select
          label="How will you measure success?"
          value={smartGoal.measurableMetric}
          onChange={(e) => {
            const value = e.target.value as MeasurableMetric;
            setSmartGoal(prev => ({
              ...prev,
              measurableMetric: value,
              customMetric: value === 'custom' ? prev.customMetric : undefined
            }));
          }}
          fullWidth
          required
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        >
          {MEASURABLE_METRIC_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {smartGoal.measurableMetric === 'custom' && (
          <TextField
            label="Custom Metric"
            value={smartGoal.customMetric || ''}
            onChange={(e) => setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))}
            fullWidth
            required
            helperText="Define your custom way of measuring progress"
          />
        )}
      </Stack>
    </Box>
  );

  const renderRoutineScheduleDialog = () => {
    // Return empty fragment if not open
    if (!openRoutineModal) return <></>;
    
    const routine = smartGoal.routines.find(r => r.id === openRoutineModal);
    if (!routine) return <></>;

    return (
      <Dialog open={!!openRoutineModal} onClose={() => setOpenRoutineModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2
        }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
            <ScheduleIcon sx={{ mr: 1 }} />
            Configure Schedule
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={routine.frequency}
                onChange={(e) => {
                  const frequency = e.target.value as typeof routine.frequency;
                  setSmartGoal(prev => {
                    const newRoutines = prev.routines.map(r => 
                      r.id === openRoutineModal ? {
                        ...r,
                        frequency,
                        schedule: {
                          ...r.schedule,
                          type: frequency
                        }
                      } : r
                    );
                    return { ...prev, routines: newRoutines };
                  });
                }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Target Count"
              type="number"
              value={routine.targetCount}
              onChange={(e) => {
                const targetCount = parseInt(e.target.value) || 1;
                setSmartGoal(prev => {
                  const newRoutines = prev.routines.map(r => 
                    r.id === openRoutineModal ? {
                      ...r,
                      targetCount,
                      schedule: {
                        ...r.schedule,
                        targetCount
                      }
                    } : r
                  );
                  return { ...prev, routines: newRoutines };
                });
              }}
              fullWidth
              inputProps={{ min: 1 }}
            />
            
            {routine.frequency === 'weekly' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Schedule for {routine.targetCount} days per week
                </Typography>
                <Stack spacing={2}>
                  {Array.from({ length: routine.targetCount }).map((_, i) => {
                    const currentSchedule = routine.schedule.daysOfWeek?.[i];
                    return (
                      <Box key={i} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <FormControl fullWidth>
                            <InputLabel>Day</InputLabel>
                            <Select
                              value={currentSchedule?.day || 'monday'}
                              onChange={(e) => {
                                const day = e.target.value as DayOfWeek;
                                setSmartGoal(prev => {
                                  const newRoutines = prev.routines.map(r => {
                                    if (r.id !== openRoutineModal) return r;
                                    
                                    const newDaysOfWeek = [...(r.schedule.daysOfWeek || [])];
                                    while (newDaysOfWeek.length < i + 1) {
                                      newDaysOfWeek.push({
                                        day: 'monday',
                                        time: { hour: 9, minute: 0 }
                                      });
                                    }
                                    
                                    newDaysOfWeek[i] = {
                                      ...newDaysOfWeek[i],
                                      day
                                    };
                                    
                                    return {
                                      ...r,
                                      schedule: {
                                        ...r.schedule,
                                        daysOfWeek: newDaysOfWeek
                                      }
                                    };
                                  });
                                  return { ...prev, routines: newRoutines };
                                });
                              }}
                            >
                              {DAYS_OF_WEEK.map(day => (
                                <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <TimePicker 
                            label="Time"
                            value={currentSchedule?.time ? 
                              new Date(0, 0, 0, currentSchedule.time.hour, currentSchedule.time.minute) : 
                              new Date(0, 0, 0, 9, 0)
                            }
                            onChange={(date) => {
                              if (!date) return;
                              const time = handleTimeChange(date);
                              setSmartGoal(prev => {
                                const newRoutines = prev.routines.map(r => {
                                  if (r.id !== openRoutineModal) return r;
                                  
                                  const newDaysOfWeek = [...(r.schedule.daysOfWeek || [])];
                                  while (newDaysOfWeek.length < i + 1) {
                                    newDaysOfWeek.push({
                                      day: 'monday',
                                      time: { hour: 9, minute: 0 }
                                    });
                                  }
                                  
                                  newDaysOfWeek[i] = {
                                    ...newDaysOfWeek[i],
                                    time
                                  };
                                  
                                  return {
                                    ...r,
                                    schedule: {
                                      ...r.schedule,
                                      daysOfWeek: newDaysOfWeek
                                    }
                                  };
                                });
                                return { ...prev, routines: newRoutines };
                              });
                            }}
                          />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {routine.frequency === 'monthly' && (
              <FormControl fullWidth>
                <InputLabel>Day of Month</InputLabel>
                <Select
                  value={routine.schedule.dayOfMonth || 1}
                  onChange={(e) => {
                    const dayOfMonth = parseInt(e.target.value as string);
                    setSmartGoal(prev => {
                      const newRoutines = prev.routines.map(r => 
                        r.id === openRoutineModal ? {
                          ...r,
                          schedule: {
                            ...r.schedule,
                            dayOfMonth
                          }
                        } : r
                      );
                      return { ...prev, routines: newRoutines };
                    });
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoutineModal(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => setOpenRoutineModal(null)}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  }; // End of renderRoutineScheduleDialog

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom>
        Create a New Goal
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentStep} aria-label="goal setup tabs">
          <Tab label="Goal Setup" />
          <Tab label="Tasks" />
          <Tab label="Routines" />
          <Tab label="Review" />
        </Tabs>
      </Box>

      {currentStep === 0 && renderGoalSetupStep()}
      {currentStep === 1 && renderTasksStep()}
      {currentStep === 2 && renderRoutinesStep()}
      {currentStep === 3 && renderReviewStep()}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>
        )}
        {currentStep < 3 ? (
          <Button variant="contained" onClick={() => setCurrentStep(currentStep + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit}>
            Submit Goal
          </Button>
        )}
      </Box>

      {renderRoutineScheduleDialog()}
    </Container>
  );
};

export default GoalsPage;