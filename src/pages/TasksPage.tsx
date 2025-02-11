import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  Flag, 
  ArrowRight, 
  X,
  Clock,
  AlertCircle,
  BarChart,
  Plus
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Container,
  Chip,
  IconButton,
  Card,
  CardContent,
  Stack,
  Divider,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useScheduledTasks } from '../hooks/useScheduledTasks';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { Timestamp } from 'firebase/firestore';
import type { ScheduledTask } from '../hooks/useScheduledTasks';
import type { TaskPriority, TaskStatus } from '../types';

interface TaskFormData {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  goalId?: string;
}

const TasksPage: React.FC = () => {
  const { scheduledTasks, loading, completeTask } = useScheduledTasks();
  const { goals, updateGoal } = useGoalsContext();
  const { userGoals, updateUserGoal } = useSharedGoalsContext();
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    goalId: ''
  });

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'j':
          setSelectedIndex(prev => 
            prev < scheduledTasks.length - 1 ? prev + 1 : prev
          );
          break;
        case 'k':
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'x':
          if (selectedIndex >= 0 && selectedIndex < scheduledTasks.length) {
            completeTask(scheduledTasks[selectedIndex].id);
          }
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < scheduledTasks.length) {
            setSelectedTask(scheduledTasks[selectedIndex]);
          }
          break;
        case 'Escape':
          setSelectedTask(null);
          setShowAddModal(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scheduledTasks, selectedIndex, completeTask]);

  const formatDueDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (date < today) return 'Overdue';
    return date.toLocaleDateString();
  };

  const handleAddTask = async () => {
    if (!formData.title.trim()) return;

    try {
      const selectedGoal = [...goals, ...userGoals].find(g => g.id === formData.goalId);
      if (!selectedGoal) return;

      const newTask = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.title.trim(),
        description: formData.description?.trim(),
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : undefined,
        priority: formData.priority,
        status: 'not_started' as TaskStatus,
        completed: false,
        ownerId: selectedGoal.ownerId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        goalId: selectedGoal.id,
        areaId: selectedGoal.areaId,
        sharedWith: [],
        permissions: {
          [selectedGoal.ownerId]: {
            edit: true,
            view: true
          }
        }
      };

      const updatedTasks = [...selectedGoal.tasks, newTask];
      
      if ('parentGoalId' in selectedGoal) {
        await updateUserGoal(selectedGoal.id, { tasks: updatedTasks });
      } else {
        await updateGoal(selectedGoal.id, { tasks: updatedTasks });
      }

      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        goalId: ''
      });
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Tasks
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddModal(true)}
          >
            Add Task
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {scheduledTasks.length === 0 
              ? 'All caught up! Great job!' 
              : `${scheduledTasks.length} tasks need your attention`}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              <Box component="kbd" sx={{ px: 1, py: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>j</Box> down,{' '}
              <Box component="kbd" sx={{ px: 1, py: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>k</Box> up,{' '}
              <Box component="kbd" sx={{ px: 1, py: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>x</Box> complete,{' '}
              <Box component="kbd" sx={{ px: 1, py: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>enter</Box> details
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Stack spacing={1}>
        {scheduledTasks.map((task, index) => (
          <Card
            key={task.id}
            onClick={() => setSelectedTask(task)}
            sx={{
              cursor: 'pointer',
              opacity: task.completed ? 0.5 : 1,
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 3
              },
              ...(index === selectedIndex && {
                outline: '2px solid',
                outlineColor: 'primary.main'
              })
            }}
          >
            <CardContent sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              '&:last-child': { pb: 2 }
            }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  completeTask(task.id);
                }}
                sx={{
                  width: 32,
                  height: 32,
                  border: 2,
                  borderColor: task.completed ? 'success.main' : 'grey.300',
                  bgcolor: task.completed ? 'success.main' : 'transparent',
                  '&:hover': {
                    borderColor: 'success.main'
                  }
                }}
              >
                {task.completed && (
                  <CheckCircle color="white" size={16} />
                )}
              </IconButton>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {task.title}
                  </Typography>
                  {task.source.type === 'routine' && (
                    <Chip
                      label="Routine"
                      size="small"
                      color="primary"
                      sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
                    />
                  )}
                  {task.priority === 'high' && (
                    <Flag className="text-red-500" />
                  )}
                </Box>
                
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                  {task.source.goalName && (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ArrowRight className="w-3 h-3" />
                      {task.source.goalName}
                    </Typography>
                  )}
                  {task.dueDate && (
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: task.dueDate.toDate() < new Date() ? 'error.main' : 'text.secondary'
                      }}
                    >
                      <Calendar className="w-3 h-3" />
                      {formatDueDate(task.dueDate)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        ))}

        {scheduledTasks.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'success.light',
                mb: 2
              }}
            >
              <CheckCircle color="#2e7d32" size={24} />
            </Box>
            <Typography variant="h6" color="text.primary">
              All Clear!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You're all caught up. Time to celebrate or plan your next goal!
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Task</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal
                  </label>
                  <select
                    value={formData.goalId}
                    onChange={e => setFormData(prev => ({ ...prev, goalId: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a goal</option>
                    {goals.map(goal => (
                      <option key={goal.id} value={goal.id}>{goal.name}</option>
                    ))}
                    {userGoals.map(goal => (
                      <option key={goal.id} value={goal.id}>{goal.name} (Shared)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!formData.title.trim() || !formData.goalId}
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedTask.title}
                    </h2>
                    {selectedTask.source.type === 'routine' && (
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        Routine
                      </span>
                    )}
                    {selectedTask.priority === 'high' && (
                      <Flag className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {selectedTask.source.goalName && (
                    <p className="mt-1 text-gray-600">
                      Part of goal: {selectedTask.source.goalName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedTask.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-600">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created</p>
                      <p className="text-sm text-gray-600">
                        {selectedTask.createdAt.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {selectedTask.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Due Date</p>
                        <p className={`text-sm ${
                          selectedTask.dueDate.toDate() < new Date()
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {formatDueDate(selectedTask.dueDate)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Priority</p>
                      <p className={`text-sm ${
                        selectedTask.priority === 'high'
                          ? 'text-red-600'
                          : selectedTask.priority === 'medium'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <p className="text-sm text-gray-600">
                        {selectedTask.status.replace('_', ' ').charAt(0).toUpperCase() + 
                         selectedTask.status.slice(1).replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedTask.source.type === 'routine' && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Routine Details</h3>
                    <p className="text-gray-600">
                      This task is part of your routine: {selectedTask.source.routineName}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    completeTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default TasksPage;