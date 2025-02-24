import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  Flag, 
  ArrowRight, 
  X,
  Clock,
  AlertCircle,
  BarChart,
  Plus,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useScheduledTasks } from '../hooks/useScheduledTasks';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import type { ScheduledTask } from '../hooks/useScheduledTasks';
import type { TaskPriority, TaskStatus } from '../types';
import { timestampToDate, dateToTimestamp } from '../utils/date';
import { fromFirebaseTimestamp, toFirebaseTimestamp } from '../utils/firebase-adapter';
import { Timestamp } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

interface TaskFormData {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  goalId?: string;
}

interface TaskSection {
  title: string;
  tasks: ScheduledTask[];
  icon?: React.ReactNode;
  color?: string;
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
    const handleKeyPress = (event: KeyboardEvent): void => {
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

  const formatDueDate = (timestamp: Timestamp): string => {
    const date = timestampToDate(timestamp);
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

  const handleAddTask = async (): Promise<void> => {
    if (!formData.title.trim()) return;

    try {
      const selectedGoal = [...goals, ...userGoals].find(g => g.id === formData.goalId);
      if (!selectedGoal) return;

      const newTask = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.title.trim(),
        description: formData.description?.trim(),
        dueDate: formData.dueDate ? toFirebaseTimestamp(dateToTimestamp(new Date(formData.dueDate))) : undefined,
        priority: formData.priority,
        status: 'not_started' as TaskStatus,
        completed: false,
        ownerId: selectedGoal.ownerId,
        createdAt: FirebaseTimestamp.now(),
        updatedAt: FirebaseTimestamp.now(),
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

  const categorizedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const sections: TaskSection[] = [
      {
        title: 'Overdue',
        tasks: [],
        icon: <AlertTriangle className="text-destructive" />,
        color: 'destructive'
      },
      {
        title: 'Today',
        tasks: [],
        icon: <Calendar className="text-primary" />,
        color: 'primary'
      },
      {
        title: 'Next 3 Days',
        tasks: [],
        icon: <Clock className="text-secondary" />,
        color: 'secondary'
      }
    ];

    scheduledTasks.forEach(task => {
      if (!task.completed) {
        if (task.dueDate) {
          const dueDate = timestampToDate(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          if (dueDate < today) {
            sections[0].tasks.push(task);
          } else if (dueDate.getTime() === today.getTime()) {
            sections[1].tasks.push(task);
          } else if (dueDate <= threeDaysFromNow) {
            sections[2].tasks.push(task);
          }
        } else if (task.isRoutine) {
          // Routines without specific dates go into Today
          sections[1].tasks.push(task);
        }
      }
    });

    // Only return sections that have tasks
    return sections.filter(section => section.tasks.length > 0);
  }, [scheduledTasks]);

  const TaskCard: React.FC<{ task: ScheduledTask; index: number }> = ({ task, index }): JSX.Element => (
    <Card
      onClick={() => setSelectedTask(task)}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        task.completed && "opacity-50",
        index === selectedIndex && "ring-2 ring-primary"
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            completeTask(task.id);
          }}
          className="h-8 w-8"
        >
          {task.completed ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Icons.circle className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <div className="flex-grow">
          <h3 className={cn(
            "text-sm font-medium",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {task.dueDate && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </Badge>
            )}
            <Badge
              variant={
                task.priority === 'high' ? 'destructive' :
                task.priority === 'medium' ? 'secondary' :
                'default'
              }
            >
              {task.priority}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="grid gap-6">
        {categorizedTasks.map((section, sectionIndex) => (
          <div key={section.title}>
            <div className="mb-4 flex items-center gap-2">
              {section.icon}
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <Badge variant="outline">{section.tasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {section.tasks.map((task, taskIndex) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={taskIndex}
                />
              ))}
            </div>
            {sectionIndex < categorizedTasks.length - 1 && (
              <Separator className="my-6" />
            )}
          </div>
        ))}
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Select
                value={formData.goalId}
                onValueChange={(value: string) => 
                  setFormData(prev => ({ ...prev, goalId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {[...goals, ...userGoals].map(goal => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;