import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Divider,
  Button,
  TextField,
  IconButton,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import {
  Calendar,
  Clock,
  AlertCircle,
  Flag,
  ArrowLeft,
  CheckCircle,
  Edit2,
  Save,
  X,
  Target,
  MessageSquare,
  Settings,
  Info,
  CalendarClock,
  ListTodo
} from 'lucide-react';
import { useScheduledTasks } from '../hooks/useScheduledTasks';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { timestampToDate, dateToTimestamp } from '../utils/date';
import { toFirebaseTimestamp } from '../utils/firebase-adapter';
import type { ScheduledTask } from '../hooks/useScheduledTasks';
import type { TaskPriority, TaskStatus } from '../types';

interface TaskNotes {
  content: string;
  lastUpdated: Date;
}

interface TaskEditForm {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}

interface SaveState {
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export const TaskDetailsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { scheduledTasks, completeTask, loading: tasksLoading } = useScheduledTasks();
  const { goals, updateGoal } = useGoalsContext();
  const { userGoals, updateUserGoal } = useSharedGoalsContext();
  
  const [task, setTask] = useState<ScheduledTask | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [notes, setNotes] = useState<TaskNotes>({
    content: '',
    lastUpdated: new Date()
  });
  const [editForm, setEditForm] = useState<TaskEditForm>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'not_started'
  });
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    saving: false,
    lastSaved: null,
    error: null
  });
  const [debouncedContent, setDebouncedContent] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (taskId && scheduledTasks.length > 0) {
      const foundTask = scheduledTasks.find(t => t.id === taskId);
      if (foundTask) {
        setTask(foundTask);
        // Initialize edit form with current task data
        setEditForm({
          title: foundTask.title,
          description: foundTask.description || '',
          dueDate: foundTask.dueDate ? timestampToDate(foundTask.dueDate).toISOString().split('T')[0] : '',
          priority: foundTask.priority,
          status: foundTask.status
        });
        // Initialize notes from task data
        if (foundTask.notes) {
          setNotes({
            content: foundTask.notes.content,
            lastUpdated: timestampToDate(foundTask.notes.lastUpdated)
          });
        } else {
          setNotes({
            content: '',
            lastUpdated: new Date()
          });
        }
      } else {
        setError('Task not found');
      }
    }
  }, [taskId, scheduledTasks]);

  // Debounced save function
  useEffect(() => {
    if (!debouncedContent || !task) return;

    const timer = setTimeout(async () => {
      try {
        setSaveState(prev => ({ ...prev, saving: true }));
        
        const updatedTask = {
          ...task,
          notes: {
            content: debouncedContent,
            lastUpdated: toFirebaseTimestamp(dateToTimestamp(new Date()))
          }
        };

        // Find the goal that contains this task
        const goal = goals.find(g => g.tasks.some(t => t.id === task.id)) ||
                    userGoals.find(g => g.tasks.some(t => t.id === task.id));

        if (!goal) {
          throw new Error('Goal not found');
        }

        // Update the task in the goal's tasks array
        const updatedTasks = goal.tasks.map(t =>
          t.id === task.id ? updatedTask : t
        );

        // Update the goal with the new tasks array
        if ('parentGoalId' in goal) {
          await updateUserGoal(goal.id, { tasks: updatedTasks });
        } else {
          await updateGoal(goal.id, { tasks: updatedTasks });
        }

        setTask(updatedTask);
        setSaveState({
          saving: false,
          lastSaved: new Date(),
          error: null
        });
      } catch (err) {
        console.error('Error auto-saving notes:', err);
        setSaveState(prev => ({
          ...prev,
          saving: false,
          error: 'Failed to save notes'
        }));
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [debouncedContent]);

  // Handle note changes
  const handleNoteChange = (content: string) => {
    setNotes(prev => ({ ...prev, content }));
    setDebouncedContent(content);
  };

  const formatDueDate = (timestamp: any) => {
    if (!timestamp) return 'No due date';
    
    const date = timestampToDate(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return 'Overdue';
    if (date.toDateString() === today.toDateString()) return 'Today';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleComplete = async () => {
    if (!task) return;
    try {
      await completeTask(task.id);
      navigate('/tasks');
    } catch (err) {
      setError('Failed to complete task');
    }
  };

  const handleSaveTask = async () => {
    if (!task) return;

    try {
      const updatedTask = {
        ...task,
        title: editForm.title,
        description: editForm.description,
        dueDate: editForm.dueDate ? toFirebaseTimestamp(dateToTimestamp(new Date(editForm.dueDate + 'T00:00:00'))) : undefined,
        priority: editForm.priority,
        status: editForm.status,
        updatedAt: toFirebaseTimestamp(dateToTimestamp(new Date()))
      };

      // Find the goal that contains this task
      const goal = goals.find(g => g.tasks.some(t => t.id === task.id)) ||
                  userGoals.find(g => g.tasks.some(t => t.id === task.id));

      if (!goal) {
        throw new Error('Goal not found');
      }

      // Update the task in the goal's tasks array
      const updatedTasks = goal.tasks.map(t =>
        t.id === task.id ? updatedTask : t
      );

      // Update the goal with the new tasks array
      if ('parentGoalId' in goal) {
        await updateUserGoal(goal.id, { tasks: updatedTasks });
      } else {
        await updateGoal(goal.id, { tasks: updatedTasks });
      }

      setTask(updatedTask);
      setIsEditingTask(false);
      setError(null);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  if (tasksLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Task not found'}</Alert>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate('/tasks')}
          sx={{ mt: 2 }}
        >
          Back to Tasks
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate('/tasks')}
          sx={{ mb: 2 }}
        >
          Back to Tasks
        </Button>

        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {task.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {task.source.type === 'routine' && (
                  <Chip
                    label="Routine"
                    color="primary"
                    size="small"
                  />
                )}
                {task.priority === 'high' && (
                  <Chip
                    icon={<Flag className="text-red-500" />}
                    label="High Priority"
                    color="error"
                    size="small"
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setIsEditingTask(true)}
              >
                Edit Task
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleComplete}
                disabled={task.completed}
              >
                {task.completed ? 'Completed' : 'Complete Task'}
              </Button>
            </Box>
          </Box>

          {/* Task Details */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Target />
                <Typography variant="body1">
                  Goal: {task.source.goalName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Calendar />
                <Typography variant="body1">
                  Due: {formatDueDate(task.dueDate)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock />
                <Typography variant="body1">
                  Created: {timestampToDate(task.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              {task.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {task.description}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Notes Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MessageSquare size={20} />
                Notes
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {saveState.saving && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                      Saving...
                    </Typography>
                  </Box>
                )}
                {saveState.error && (
                  <Typography variant="caption" color="error">
                    {saveState.error}
                  </Typography>
                )}
                {saveState.lastSaved && !saveState.saving && !saveState.error && (
                  <Typography variant="caption" color="text.secondary">
                    Last saved {saveState.lastSaved.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Box>

            <TextField
              multiline
              rows={4}
              fullWidth
              value={notes.content}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Add your notes here..."
            />
          </Box>
        </Paper>
      </Box>

      {/* Edit Task Dialog */}
      <Dialog 
        open={isEditingTask} 
        onClose={() => setIsEditingTask(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 0 }}>Edit Task</DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Basic Info" 
            icon={<Info size={18} />} 
            iconPosition="start"
          />
          <Tab 
            label="Details & Timing" 
            icon={<CalendarClock size={18} />} 
            iconPosition="start"
          />
          <Tab 
            label="Status & Priority" 
            icon={<ListTodo size={18} />} 
            iconPosition="start"
          />
        </Tabs>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {/* Basic Info Tab */}
            {activeTab === 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Title"
                      fullWidth
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                    
                    <TextField
                      label="Description"
                      fullWidth
                      multiline
                      rows={4}
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      helperText="Provide a clear description of what needs to be done"
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Details & Timing Tab */}
            {activeTab === 1 && (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Due Date"
                      type="date"
                      fullWidth
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      helperText="When should this task be completed?"
                    />
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Goal
                      </Typography>
                      <Typography>
                        {task?.source.goalName}
                      </Typography>
                    </Box>

                    {task?.source.type === 'routine' && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Routine
                        </Typography>
                        <Chip 
                          label="Part of Routine"
                          color="primary"
                          size="small"
                        />
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Status & Priority Tab */}
            {activeTab === 2 && (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={editForm.priority}
                        label="Priority"
                        onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                      >
                        <MenuItem value="low">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flag size={16} className="text-green-500" />
                            Low Priority
                          </Box>
                        </MenuItem>
                        <MenuItem value="medium">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flag size={16} className="text-yellow-500" />
                            Medium Priority
                          </Box>
                        </MenuItem>
                        <MenuItem value="high">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flag size={16} className="text-red-500" />
                            High Priority
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={editForm.status}
                        label="Status"
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                      >
                        <MenuItem value="not_started">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Clock size={16} />
                            Not Started
                          </Box>
                        </MenuItem>
                        <MenuItem value="in_progress">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Target size={16} className="text-blue-500" />
                            In Progress
                          </Box>
                        </MenuItem>
                        <MenuItem value="completed">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle size={16} className="text-green-500" />
                            Completed
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditingTask(false)}>Cancel</Button>
          <Button onClick={handleSaveTask} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 