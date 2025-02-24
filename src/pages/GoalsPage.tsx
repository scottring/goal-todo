import React, { useState, useEffect } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Timestamp as FirebaseTimestamp } from '@firebase/firestore';
import type { Timestamp, FirebaseTimestamp as CustomFirebaseTimestamp } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Edit,
  Share2,
  Plus,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import type { 
  SourceActivity, 
  RoutineWithoutSystemFields, 
  BaseDocument,
  MeasurableMetric,
  AchievabilityCheck,
  TaskStatus,
  TaskPriority,
  TimeTrackingType,
  ReviewCycle,
  RoutineSchedule,
  Routine,
  TaskReviewItem as TaskReviewItemType
} from '../types';
import { toast } from 'react-hot-toast';
import GoalSharingModal from '../components/GoalSharingModal';
import { v4 as uuidv4 } from 'uuid';
import { useWeeklyPlanning } from '../contexts/WeeklyPlanningContext';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { useToast } from '@/components/ui/use-toast';
import { dateToTimestamp, timestampToDate } from '../utils/date';
import { convertToFirebaseTimestamp, convertFromFirebaseTimestamp } from '../utils/firebase-adapter';
import type { DayPickerSingleProps } from 'react-day-picker';
import { ScrollArea } from "@/components/ui/scroll-area";

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
  return dateToTimestamp(now);
};

const timestampToDateString = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '';
  try {
    const date = timestampToDate(timestamp);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting timestamp to date string:', error);
    return '';
  }
};

type GoalTimeTracking = {
  type: 'fixed_deadline' | 'recurring_review';
  deadline?: Timestamp;
  reviewCycle?: string;
};

interface SmartGoalForm {
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  timeTracking: {
    type: TimeTrackingType;
    deadline?: Timestamp;
    reviewCycle?: ReviewCycle;
  };
  areaId: string;
  milestones: {
    id: string;
    name: string;
    targetDate?: Timestamp;
    successCriteria: string;
    status: TaskStatus;
    tasks: string[];
  }[];
  tasks: {
    id: string;
    title: string;
    description?: string;
    dueDate?: Timestamp;
    priority: TaskPriority;
    status: TaskStatus;
    completed: boolean;
    assignedTo?: string;
  }[];
  routines: {
    id: string;
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    schedule: RoutineSchedule;
    targetCount: number;
    endDate?: Timestamp;
    completionDates: Timestamp[];
  }[];
}

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

const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: 'Not Started', value: 'not_started' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' }
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
    targetDate: dateToTimestamp(new Date()),
    successCriteria: '',
    status: 'not_started',
    tasks: []
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
      assignedTo: undefined
    }
  ]
});

const addRoutine = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  routines: [
    ...smartGoal.routines,
    {
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
      endDate: undefined
    }
  ]
});

const addMilestone = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  milestones: [
    ...smartGoal.milestones,
    {
      id: uuidv4(),
      name: '',
      targetDate: dateToTimestamp(new Date()),
      successCriteria: '',
      status: 'not_started' as TaskStatus,
      tasks: []
    }
  ]
});

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

interface SharedTask {
  id: string;
  title: string;
  status: 'completed' | 'pending';
  assignedTo: string;
  dueDate: FirebaseTimestamp;
}

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

const WeeklyReviewStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const {
    currentSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview,
    sendTeamReminders
  } = useWeeklyPlanning();
  const { goals } = useGoalsContext();
  const { toast } = useToast();

  const taskReviewCount = currentSession?.reviewPhase?.taskReviews?.length ?? 0;
  const sharedGoalReviewCount = currentSession?.reviewPhase?.sharedGoalReviews?.length ?? 0;
  const goalCount = goals?.length ?? 0;

  const handleTaskAction = async (taskId: string, action: TaskAction) => {
    try {
      const task = currentSession?.reviewPhase?.taskReviews?.find(t => t.taskId === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      await updateTaskReview(task);
    } catch (error) {
      console.error('Error handling task action:', error);
      toast({
        variant: "destructive",
        description: "Failed to update task status"
      });
    }
  };

  const handleGoalReview = async (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => {
    try {
      await updateLongTermGoalReview(goalId, madeProgress, adjustments, nextReviewDate);
    } catch (error) {
      console.error('Error updating goal review:', error);
      toast({
        variant: "destructive",
        description: "Failed to update goal review"
      });
    }
  };

  const handleSharedGoalUpdate = async (goalId: string, taskId: string, status: 'completed' | 'pending') => {
    try {
      const completedTasks = status === 'completed' ? [taskId] : [];
      const pendingTasks = status === 'pending' ? [taskId] : [];
      await updateSharedGoalReview(goalId, completedTasks, pendingTasks);
    } catch (error) {
      console.error('Error updating shared goal status:', error);
      toast({
        variant: "destructive",
        description: "Failed to update shared goal status"
      });
    }
  };

  const handleSendReminder = async (goalId: string, userId: string) => {
    try {
      await sendTeamReminders(goalId, [userId]);
      toast({
        description: "Reminder sent successfully"
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        variant: "destructive",
        description: "Failed to send reminder"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="relative">
            Tasks
            {taskReviewCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {taskReviewCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="relative">
            Shared Goals
            {sharedGoalReviewCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sharedGoalReviewCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="longterm" className="relative">
            Long-term Goals
            {goalCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {goalCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          <TaskReviewList
            tasks={currentSession?.reviewPhase?.taskReviews || []}
            onTaskAction={handleTaskAction}
          />
        </TabsContent>
        <TabsContent value="shared" className="mt-6">
          {currentSession?.reviewPhase?.sharedGoalReviews?.map(review => {
            const tasks: SharedTask[] = [
              ...review.completedTasks.map(taskId => ({
                id: taskId,
                title: `Task ${taskId}`, // TODO: Get actual task title
                status: 'completed' as const,
                assignedTo: '', // TODO: Get actual assignee
                dueDate: convertToFirebaseTimestamp(dateToTimestamp(new Date())) as FirebaseTimestamp
              })),
              ...review.pendingTasks.map(taskId => ({
                id: taskId,
                title: `Task ${taskId}`, // TODO: Get actual task title
                status: 'pending' as const,
                assignedTo: '', // TODO: Get actual assignee
                dueDate: convertToFirebaseTimestamp(dateToTimestamp(new Date())) as FirebaseTimestamp
              }))
            ];

            return (
              <SharedGoalReview
                key={review.goalId}
                goalId={review.goalId}
                goalName={`Shared Goal ${review.goalId}`} // TODO: Get actual goal name
                tasks={tasks}
                collaborators={review.teamReminders.map(userId => ({
                  id: userId,
                  name: `User ${userId}`, // TODO: Get actual user name
                  email: `user${userId}@example.com` // TODO: Get actual user email
                }))}
                onUpdateTaskStatus={handleSharedGoalUpdate}
                onSendReminder={handleSendReminder}
              />
            );
          })}
        </TabsContent>
        <TabsContent value="longterm" className="mt-6">
          {goals?.map(goal => {
            const lastReviewDate = goal.timeTracking.reviewStatus?.lastReviewDate;
            const nextReviewDate = goal.timeTracking.nextReviewDate;

            return (
              <LongTermGoalReview
                key={goal.id}
                goalId={goal.id}
                goalName={goal.name}
                description={goal.specificAction}
                lastReviewDate={lastReviewDate ? convertToFirebaseTimestamp(dateToTimestamp(new Date(lastReviewDate.seconds * 1000))) as FirebaseTimestamp : undefined}
                nextReviewDate={nextReviewDate ? convertToFirebaseTimestamp(dateToTimestamp(new Date(nextReviewDate.seconds * 1000))) as FirebaseTimestamp : undefined}
                onUpdateReview={handleGoalReview}
              />
            );
          })}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
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
  const [editMode, setEditMode] = useState<'wizard' | 'edit'>('wizard');
  const [smartGoal, setSmartGoal] = useState<SmartGoalForm>(initialSmartGoal);
  const [submitting, setSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingGoal, setSharingGoal] = useState<SourceActivity | null>(null);
  const [error, setError] = useState<Error | null>(null);

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
                  : dateToTimestamp(new Date())
              }
          )
        },
        milestones: smartGoal.milestones.map(m => ({
          id: m.id || uuidv4(),
          name: m.name.trim(),
          targetDate: m.targetDate || dateToTimestamp(new Date()),
          successCriteria: m.successCriteria.trim(),
          status: m.status,
          tasks: m.tasks || []
        })),
        areaId: smartGoal.areaId,
        sharedWith: [],
        tasks: smartGoal.tasks.map(task => ({
          id: task.id || uuidv4(),
          ownerId: currentUser?.uid || '',
          createdAt: dateToTimestamp(new Date()),
          updatedAt: dateToTimestamp(new Date()),
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
          createdAt: dateToTimestamp(new Date()),
          updatedAt: dateToTimestamp(new Date())
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
      setEditMode('wizard');
    } catch (error) {
      console.error('Error submitting goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (goal: SourceActivity) => {
    setEditingGoal(goal.id);
    setEditMode('edit');
    setSmartGoal({
      ...initialSmartGoal,
      name: goal.name,
      specificAction: goal.specificAction,
      measurableMetric: goal.measurableMetric,
      customMetric: goal.customMetric ?? undefined,
      achievabilityCheck: goal.achievabilityCheck,
      relevance: goal.relevance,
      timeTracking: {
        type: goal.timeTracking.type,
        deadline: goal.timeTracking.deadline ? convertFromFirebaseTimestamp(goal.timeTracking.deadline as CustomFirebaseTimestamp) : undefined,
        reviewCycle: goal.timeTracking.reviewCycle
      },
      areaId: goal.areaId,
      milestones: [],
      tasks: [],
      routines: []
    });
    setIsAdding(true);
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
    return isNaN(date.getTime()) ? undefined : dateToTimestamp(date);
  };

  const handleTaskChange = (index: number, field: keyof SmartGoalForm['tasks'][0], value: any) => {
    setSmartGoal(prev => {
      const newTasks = [...prev.tasks];
      newTasks[index] = {
        ...newTasks[index],
        [field]: field === 'dueDate' 
          ? (value instanceof Date ? dateToTimestamp(value) : (value === null ? undefined : value))
          : value,
        completed: field === 'status' ? value === 'completed' : newTasks[index].completed
      };
      return { ...prev, tasks: newTasks };
    });
  };

  const handleMilestoneChange = (index: number, field: keyof SmartGoalForm['milestones'][0], value: any) => {
    setSmartGoal(prev => {
      const newMilestones = [...prev.milestones];
      newMilestones[index] = {
        ...newMilestones[index],
        [field]: field === 'targetDate'
          ? (value instanceof Date ? dateToTimestamp(value) : (value === null ? undefined : value))
          : value
      };
      return { ...prev, milestones: newMilestones };
    });
  };

  const handleShareClick = (goal: SourceActivity) => {
    setSharingGoal(goal);
    setIsShareModalOpen(true);
  };

  const renderAreaStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Select Area</h2>
        <p className="text-sm text-muted-foreground">
          Choose the area of your life this goal belongs to
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Area</Label>
        <Select
          value={smartGoal.areaId}
          onValueChange={(value) => setSmartGoal(prev => ({ ...prev, areaId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map(area => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Areas help you organize and track related goals together
        </p>
      </div>
    </div>
  );

  const renderSpecificStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it Specific</h2>
        <p className="text-sm text-muted-foreground">
          Define your goal with clear, specific details
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="goalName">Goal Name</Label>
          <Input
            id="goalName"
            value={smartGoal.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your goal name"
            required
          />
          <p className="text-sm text-muted-foreground">
            Give your goal a clear, memorable name
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specificAction">Specific Action</Label>
          <Textarea
            id="specificAction"
            value={smartGoal.specificAction}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
            placeholder="What exactly do you want to accomplish?"
            required
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Be as specific as possible about what you want to accomplish
          </p>
        </div>
      </div>
    </div>
  );

  const renderMeasurableStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it Measurable</h2>
        <p className="text-sm text-muted-foreground">
          Define how you'll measure progress towards this goal
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="measurementType">Measurement Type</Label>
          <Select
            value={smartGoal.measurableMetric}
            onValueChange={(value: MeasurableMetric) => {
              setSmartGoal(prev => ({
                ...prev,
                measurableMetric: value,
                customMetric: value === 'custom' ? prev.customMetric : undefined
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select measurement type" />
            </SelectTrigger>
            <SelectContent>
              {MEASURABLE_METRIC_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How will you track progress towards this goal?
          </p>
        </div>

        {smartGoal.measurableMetric === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customMetric">Custom Metric</Label>
            <Input
              id="customMetric"
              value={smartGoal.customMetric || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))
              }
              placeholder="Define your custom metric"
              required
            />
            <p className="text-sm text-muted-foreground">
              Define your custom way of measuring progress
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAchievableStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it Achievable</h2>
        <p className="text-sm text-muted-foreground">
          Assess if this goal is realistic with your current resources
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="achievability">Is this goal achievable with your current resources?</Label>
        <Select
          value={smartGoal.achievabilityCheck}
          onValueChange={(value: AchievabilityCheck) => 
            setSmartGoal(prev => ({ ...prev, achievabilityCheck: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select achievability" />
          </SelectTrigger>
          <SelectContent>
            {ACHIEVABILITY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderRelevantStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it Relevant</h2>
        <p className="text-sm text-muted-foreground">
          Explain why this goal matters to you
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relevance">Why is this goal important to you?</Label>
        <Textarea
          id="relevance"
          value={smartGoal.relevance}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
            setSmartGoal(prev => ({ ...prev, relevance: e.target.value }))
          }
          placeholder="How does this goal align with your values and long-term objectives?"
          className="min-h-[120px]"
          required
        />
        <p className="text-sm text-muted-foreground italic">
          Example: Improve health and maintain work-life balance
        </p>
      </div>
    </div>
  );

  const renderTimeboundStep = (): JSX.Element => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it Time-bound</h2>
        <p className="text-sm text-muted-foreground">
          Set a clear timeline for achieving your goal
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trackingType">Tracking Type</Label>
          <Select
            value={smartGoal.timeTracking.type}
            onValueChange={(value: TimeTrackingType) => setSmartGoal(prev => ({
              ...prev,
              timeTracking: {
                ...prev.timeTracking,
                type: value
              }
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tracking type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_deadline">Fixed Deadline</SelectItem>
              <SelectItem value="recurring_review">Recurring Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {smartGoal.timeTracking.type === 'fixed_deadline' ? (
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                selected={smartGoal.timeTracking.deadline ? timestampToDate(smartGoal.timeTracking.deadline) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const timestamp = dateToTimestamp(date);
                    setSmartGoal(prev => ({
                      ...prev,
                      timeTracking: {
                        ...prev.timeTracking,
                        deadline: timestamp
                      }
                    }));
                  } else {
                    setSmartGoal(prev => ({
                      ...prev,
                      timeTracking: {
                        ...prev.timeTracking,
                        deadline: undefined
                      }
                    }));
                  }
                }}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              When do you want to achieve this goal by?
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="reviewCycle">Review Cycle</Label>
            <Select
              value={smartGoal.timeTracking.reviewCycle || ''}
              onValueChange={(value: ReviewCycle) => setSmartGoal(prev => ({
                ...prev,
                timeTracking: {
                  ...prev.timeTracking,
                  reviewCycle: value,
                  nextReviewDate: calculateNextReviewDate(value)
                }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select review cycle" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_CYCLE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How often do you want to review your progress?
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMilestonesStep = (): JSX.Element => (
    <div className="space-y-4">
      {smartGoal.milestones.map((milestone, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">{milestone.name}</h3>
              <p className="text-sm text-muted-foreground">
                Target Date: {milestone.targetDate ? timestampToDateString(milestone.targetDate) : 'No target date'}
              </p>
              <p className="text-sm text-muted-foreground">
                Success Criteria: {milestone.successCriteria}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMilestoneChange(index, 'targetDate', undefined)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => setSmartGoal(prev => addMilestone(prev))}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Milestone
      </Button>
    </div>
  );

  const renderTasksStep = (): JSX.Element => (
    <div className="space-y-4">
      {smartGoal.tasks.map((task, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">{task.title}</h3>
              <p className="text-sm text-muted-foreground">
                Due Date: {task.dueDate ? timestampToDateString(task.dueDate) : 'No due date'}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTaskChange(index, 'dueDate', undefined)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => setSmartGoal(prev => addTask(prev))}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Task
      </Button>
    </div>
  );

  const renderRoutinesStep = () => (
    <div className="space-y-4">
      {smartGoal.routines.map((routine, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">{routine.title}</h3>
              <p className="text-sm text-muted-foreground">
                Frequency: {routine.frequency}
              </p>
              <p className="text-sm text-muted-foreground">
                Target: {routine.targetCount} times per {routine.frequency}
              </p>
              {routine.endDate && (
                <p className="text-sm text-muted-foreground">
                  End Date: {routine.endDate ? timestampToDateString(routine.endDate) : 'No end date'}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newRoutines = smartGoal.routines.filter((_, i) => i !== index);
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => setSmartGoal(prev => addRoutine(prev))}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Routine
      </Button>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Goal Name</h3>
        <p className="text-gray-900">{smartGoal.name}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Specific Action</h3>
        <p className="text-gray-900">{smartGoal.specificAction}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Measurable Metric</h3>
        <p className="text-gray-900">
          {MEASURABLE_METRIC_OPTIONS.find(opt => opt.value === smartGoal.measurableMetric)?.label}
          {smartGoal.measurableMetric === 'custom' && smartGoal.customMetric && (
            <span className="block text-sm text-gray-600 mt-1">
              Custom metric: {smartGoal.customMetric}
            </span>
          )}
        </p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Achievability</h3>
        <p className="text-gray-900">
          {ACHIEVABILITY_OPTIONS.find(opt => opt.value === smartGoal.achievabilityCheck)?.label}
        </p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Relevance</h3>
        <p className="text-gray-900">{smartGoal.relevance}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Time-bound</h3>
        <p className="text-gray-900">{smartGoal.timeTracking.type === 'fixed_deadline' ? smartGoal.timeTracking.deadline ? timestampToDateString(smartGoal.timeTracking.deadline) : 'No deadline' : REVIEW_CYCLE_OPTIONS.find(opt => opt.value === smartGoal.timeTracking.reviewCycle)?.label}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Milestones</h3>
        <div className="space-y-3">
          {smartGoal.milestones.map((milestone, index) => (
            <div key={index} className="bg-white p-3 rounded-md">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{milestone.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  milestone.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : milestone.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {STATUS_OPTIONS.find(opt => opt.value === milestone.status)?.label}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Target Date: {milestone.targetDate ? timestampToDateString(milestone.targetDate) : 'No target date'}</p>
                <p>Success Criteria: {milestone.successCriteria}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {smartGoal.routines && smartGoal.routines.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Habits & Routines</h3>
          <div className="space-y-3">
            {smartGoal.routines.map((routine, index) => (
              <div key={index} className="bg-white p-3 rounded-md">
                <h4 className="font-medium text-gray-900">{routine.title}</h4>
                {routine.description && (
                  <p className="mt-1 text-sm text-gray-600">{routine.description}</p>
                )}
                <div className="mt-2 text-sm text-gray-600">
                  <p>Frequency: {routine.frequency}</p>
                  <p>Target: {routine.targetCount} times per {routine.frequency}</p>
                  {routine.endDate && <p>End Date: {routine.endDate ? timestampToDateString(routine.endDate) : 'No end date'}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const wizardSteps = [
    {
      title: "What area is this goal for?",
      subtitle: "Choose the life area this goal belongs to",
      component: renderAreaStep
    },
    {
      title: "What do you want to achieve?",
      subtitle: "Be specific about what you want to accomplish",
      component: renderSpecificStep
    },
    {
      title: "How will you measure success?",
      subtitle: "Define concrete numbers or milestones",
      component: renderMeasurableStep
    },
    {
      title: "Is it achievable?",
      subtitle: "Consider your resources and constraints",
      component: renderAchievableStep
    },
    {
      title: "Why is this important?",
      subtitle: "Connect this goal to your bigger picture",
      component: renderRelevantStep
    },
    {
      title: "When will you achieve this?",
      subtitle: "Set a realistic deadline or review cycle",
      component: renderTimeboundStep
    },
    {
      title: "Break it down",
      subtitle: "List the key milestones to reach your goal",
      component: renderMilestonesStep
    },
    {
      title: "Add Tasks",
      subtitle: "Create actionable tasks to achieve your milestones",
      component: renderTasksStep
    },
    {
      title: "Add Habits & Routines",
      subtitle: "Create recurring actions to support your goal",
      component: renderRoutinesStep
    },
    {
      title: "Review Your SMART Goal",
      subtitle: "Make sure everything looks right",
      component: renderReviewStep
    }
  ];

  const renderEditForm = () => (
    <div className="space-y-4">
      {wizardSteps.map((step, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.subtitle}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
          <div className="mt-3">
            {step.component()}
          </div>
        </div>
      ))}
    </div>
  );

  const renderError = (error: Error): JSX.Element => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-background p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Error</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setError(null)}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      </div>
    </div>
  );

  const toFirebaseTimestamp = (date: Date | undefined): Timestamp | undefined => {
    return date ? dateToTimestamp(date) : undefined;
  };

  const fromFirebaseTimestamp = (timestamp: FirebaseTimestamp | undefined): Date | undefined => {
    if (!timestamp) return undefined;
    return timestamp.toDate();
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 0: // Specific
        return Boolean(smartGoal.specificAction);
      case 1: // Measurable
        return Boolean(smartGoal.measurableMetric);
      case 2: // Area
        return Boolean(smartGoal.areaId);
      case 3: // Achievable
        return Boolean(smartGoal.achievabilityCheck);
      case 4: // Relevant
        return Boolean(smartGoal.relevance);
      case 5: // Time-bound
        return Boolean(smartGoal.timeTracking.type) && (
          (smartGoal.timeTracking.type === 'fixed_deadline' && Boolean(smartGoal.timeTracking.deadline)) ||
          (smartGoal.timeTracking.type === 'recurring_review' && Boolean(smartGoal.timeTracking.reviewCycle))
        );
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {error && renderError(error)}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Goals</h1>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Goal Creation/Edit Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            <DialogDescription>
              {editMode === 'wizard' ? 'Follow the steps to create a SMART goal' : 'Edit your goal details'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="px-6 pb-6">
            <form onSubmit={handleSubmit}>
              {editMode === 'wizard' ? (
                <>
                  <Stepper
                    steps={wizardSteps.map(step => ({
                      title: step.title,
                      description: step.subtitle
                    }))}
                    activeStep={currentStep}
                  />
                  <div className="mt-6">
                    {wizardSteps[currentStep].component()}
                  </div>
                </>
              ) : (
                renderEditForm()
              )}

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSmartGoal(initialSmartGoal);
                    setIsAdding(false);
                    setCurrentStep(0);
                    setEditingGoal(null);
                    setEditMode('wizard');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      {editingGoal ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{editingGoal ? 'Update Goal' : 'Create Goal'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Goals List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals?.map(goal => (
          <Card key={goal.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{goal.name}</CardTitle>
                  {areas.find(area => area.id === goal.areaId)?.name && (
                    <Badge variant="secondary">
                      {areas.find(area => area.id === goal.areaId)?.name}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShareClick(goal)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(goal)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {goal.specificAction}
              </p>
              {goal.timeTracking.type === 'fixed_deadline' && goal.timeTracking.deadline && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Due: {timestampToDateString(goal.timeTracking.deadline)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Goal Sharing Modal */}
      {isShareModalOpen && sharingGoal && (
        <GoalSharingModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharingGoal(null);
          }}
          goalId={sharingGoal.id}
          initialTitle={sharingGoal.name}
        />
      )}
    </div>
  );
};

export default GoalsPage;