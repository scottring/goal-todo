import React, { useState, useEffect } from 'react';
import { useWeeklyPlanning, UnscheduledItem } from '../contexts/WeeklyPlanningContext';
import { TaskReviewItem, TaskPriority, RoutineSchedule, DaySchedule, TimeOfDay, SourceActivity } from '../types';
import { dateToTimestamp, timestampToDate, now } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { WeeklyPlanSummary } from '../components/WeeklyPlanSummary';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";

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
  startNewSession: () => Promise<void>;
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
}

const steps = [
  { title: 'Start Session', description: 'Begin your weekly planning' },
  { title: 'Weekly Review', description: 'Review your progress' },
  { title: 'Weekly Planning', description: 'Plan your next week' },
  { title: 'Finalize', description: 'Complete your session' }
];

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
    getScheduleSuggestions
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
      <div className="container flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Weekly Planning & Review</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="py-6">
          <Stepper steps={steps} activeStep={activeStep} />
        </CardContent>
      </Card>

      {renderStepContent(activeStep)}
    </div>
  );
};

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

const StartSessionStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Your Weekly Planning Session</CardTitle>
        <CardDescription>
          Welcome to your weekly planning session. This will help you review your progress and plan for the upcoming week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          During this session, you'll:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Review your tasks from the past week</li>
          <li>Check progress on your long-term goals</li>
          <li>Plan your tasks for the upcoming week</li>
          <li>Organize your schedule effectively</li>
        </ul>
      </CardContent>
      <div className="flex justify-end p-6">
        <Button onClick={onNext}>Start Session</Button>
      </div>
    </Card>
  );
};

const WeeklyReviewStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState("tasks");
  const {
    currentSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview,
    sendTeamReminders
  } = useWeeklyPlanning();

  if (!currentSession?.reviewPhase) {
    return (
      <Card>
        <CardContent>
          <Alert>
            <AlertDescription>No active review session found.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Review</CardTitle>
        <CardDescription>Review your progress from the past week</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="long-term">Long-term Goals</TabsTrigger>
            <TabsTrigger value="shared">Shared Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-6">
            <TaskReviewList
              tasks={currentSession.reviewPhase.taskReviews || []}
              onTaskAction={async (taskId: string, action: string) => {
                const task = currentSession.reviewPhase.taskReviews.find(t => t.taskId === taskId);
                if (!task) return;
                await updateTaskReview({
                  taskId,
                  title: task.title || 'Untitled Task',
                  status: action === 'mark_completed' ? 'completed' : action === 'mark_missed' ? 'missed' : 'needs_review',
                  originalDueDate: task.originalDueDate || now(),
                  action: action as any,
                  priority: task.priority || 'medium',
                  completedDate: action === 'mark_completed' ? now() : undefined
                });
              }}
            />
          </TabsContent>
          <TabsContent value="long-term" className="mt-6">
            <LongTermGoalReview
              goalId="example"
              goalName="Long Term Goal"
              onUpdateReview={updateLongTermGoalReview}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-6">
            <SharedGoalReview
              goalId="example"
              goalName="Shared Goal"
              tasks={[]}
              collaborators={[]}
              onSendReminder={(goalId: string, userId: string) => {
                sendTeamReminders(goalId, [userId]);
              }}
              onUpdateTaskStatus={async (goalId: string, taskId: string, status: 'completed' | 'pending') => {
                await updateSharedGoalReview(goalId, status === 'completed' ? [taskId] : [], status === 'pending' ? [taskId] : []);
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <div className="flex justify-between p-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue to Planning
        </Button>
      </div>
    </Card>
  );
};

const WeeklyPlanningStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UnscheduledItem | null>(null);
  const { unscheduledItems, addNextWeekTask } = useWeeklyPlanning();

  const handleScheduleTask = (task: UnscheduledItem) => {
    setSelectedTask(task);
    setShowTimeDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan Your Week</CardTitle>
          <CardDescription>Schedule your tasks for the upcoming week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-lg font-medium">Calendar</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <h3 className="mb-4 text-lg font-medium">Unscheduled Tasks</h3>
              <ScrollArea className="h-[300px]">
                {unscheduledItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="outline" className="mt-1">
                        {item.priority}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleScheduleTask(item)}
                    >
                      Schedule
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Time for Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Clock className="h-5 w-5" />
              <span>Time selection will be implemented</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedTask && selectedDate) {
                addNextWeekTask(selectedTask.id, (selectedTask.priority as TaskPriority) || 'medium', selectedDate);
              }
              setShowTimeDialog(false);
            }}>
              Schedule Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue to Summary
        </Button>
      </div>
    </div>
  );
};

const FinalizeStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { currentSession, syncWithCalendar } = useWeeklyPlanning();

  if (!currentSession) {
    return (
      <Card>
        <CardContent>
          <Alert>
            <AlertDescription>No active planning session found.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Plan Summary</CardTitle>
        <CardDescription>Review and finalize your weekly plan</CardDescription>
      </CardHeader>
      <CardContent>
        <WeeklyPlanSummary
          session={currentSession}
          onSyncCalendar={syncWithCalendar}
        />
      </CardContent>
      <div className="flex justify-between p-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Complete Session
        </Button>
      </div>
    </Card>
  );
}; 