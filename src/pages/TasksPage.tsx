import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
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
        id: Math.random().toString(36).substr(2, 9), // Generate a random ID
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
        areaId: selectedGoal.areaId
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-600">
            {scheduledTasks.length === 0 
              ? 'All caught up! Great job!' 
              : `${scheduledTasks.length} tasks need your attention`}
          </p>
          <div className="text-sm text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 rounded">j</kbd> down,{' '}
            <kbd className="px-2 py-1 bg-gray-100 rounded">k</kbd> up,{' '}
            <kbd className="px-2 py-1 bg-gray-100 rounded">x</kbd> complete,{' '}
            <kbd className="px-2 py-1 bg-gray-100 rounded">enter</kbd> details
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {scheduledTasks.map((task, index) => (
          <div
            key={task.id}
            onClick={() => setSelectedTask(task)}
            className={`group flex items-center gap-3 p-4 bg-white rounded-lg border transition-all cursor-pointer ${
              task.completed ? 'opacity-50' : 'hover:shadow-md'
            } ${index === selectedIndex ? 'ring-2 ring-blue-500' : ''}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                completeTask(task.id);
              }}
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 ${
                task.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 group-hover:border-green-500'
              } transition-colors`}
            >
              {task.completed && (
                <CheckCircle className="w-4 h-4 text-white" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-gray-900 truncate ${
                  task.completed ? 'line-through' : ''
                }`}>
                  {task.title}
                </h3>
                {task.source.type === 'routine' && (
                  <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                    Routine
                  </span>
                )}
                {task.priority === 'high' && (
                  <Flag className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-sm">
                {task.source.goalName && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    {task.source.goalName}
                  </span>
                )}
                {task.dueDate && (
                  <span className={`flex items-center gap-1 ${
                    task.dueDate.toDate() < new Date() 
                      ? 'text-red-600' 
                      : 'text-gray-500'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {scheduledTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
            <p className="mt-1 text-gray-500">
              You're all caught up. Time to celebrate or plan your next goal!
            </p>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default TasksPage;