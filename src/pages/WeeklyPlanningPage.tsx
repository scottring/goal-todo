import React, { useState } from 'react';
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
  Stack
} from '@mui/material';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { Timestamp } from 'firebase/firestore';
import { NextWeekTaskPlanner } from '../components/NextWeekTaskPlanner';
import { RecurringTaskScheduler } from '../components/RecurringTaskScheduler';
import { v4 as uuidv4 } from 'uuid';
import { WeeklyPlanSummary } from '../components/WeeklyPlanSummary';

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
          tasks={[
            // TODO: Get tasks from currentSession
          ]}
          onTaskAction={handleTaskAction}
        />
      )}

      {activeTab === 1 && (
        <Stack spacing={3}>
          {/* TODO: Get long-term goals from currentSession */}
          <LongTermGoalReview
            goalId="example"
            goalName="Example Long-term Goal"
            description="This is an example long-term goal"
            lastReviewDate={Timestamp.now()} // TODO: Get actual last review date
            nextReviewDate={Timestamp.now()} // TODO: Get actual next review date
            onUpdateReview={handleGoalReview}
          />
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
    addNextWeekTask,
    scheduleRecurringTask
  } = useWeeklyPlanning();

  const handleAddNextWeekTask = async (task: Omit<PlannedTask, 'id'>) => {
    const taskId = uuidv4();
    await addNextWeekTask(taskId, task.priority, task.dueDate);
  };

  const handleReorderTasks = async (startIndex: number, endIndex: number) => {
    // TODO: Implement task reordering
  };

  const handleAddRecurringTask = async (task: Omit<RecurringTask, 'id'>) => {
    const taskId = uuidv4();
    await scheduleRecurringTask(taskId, task.frequency, task.schedule);
  };

  const nextWeekTasks = currentSession?.planningPhase.nextWeekTasks.map(task => ({
    id: task.taskId,
    title: task.taskId, // Using taskId as title temporarily
    priority: task.priority,
    dueDate: task.dueDate.toDate()
  })) || [];

  const recurringTasks = currentSession?.planningPhase.recurringTasks.map(task => ({
    id: task.routineId,
    title: task.routineId, // Using routineId as title temporarily
    frequency: task.frequency,
    schedule: task.schedule
  })) || [];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weekly Planning
      </Typography>

      <Stack spacing={3}>
        <NextWeekTaskPlanner
          tasks={nextWeekTasks}
          onAddTask={handleAddNextWeekTask}
          onUpdateTask={async () => {}} // TODO: Implement
          onDeleteTask={async () => {}} // TODO: Implement
          onReorderTasks={handleReorderTasks}
        />

        <RecurringTaskScheduler
          tasks={recurringTasks}
          onAddTask={handleAddRecurringTask}
          onUpdateTask={async () => {}} // TODO: Implement
          onDeleteTask={async () => {}} // TODO: Implement
        />
      </Stack>

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