import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { RoutineSchedule, DayOfWeek } from '../types';

interface RecurringTask {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: RoutineSchedule;
}

interface RecurringTaskSchedulerProps {
  tasks: RecurringTask[];
  onAddTask: (task: Omit<RecurringTask, 'id'>) => void;
  onDeleteTask: (taskId: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
] as const;

export const RecurringTaskScheduler: React.FC<RecurringTaskSchedulerProps> = ({
  tasks,
  onAddTask,
  onDeleteTask
}) => {
  const [newTask, setNewTask] = useState<Omit<RecurringTask, 'id'>>({
    title: '',
    frequency: 'weekly',
    schedule: {
      type: 'weekly',
      targetCount: 1,
      daysOfWeek: []
    }
  });

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    onAddTask(newTask);
    setNewTask({
      title: '',
      frequency: 'weekly',
      schedule: {
        type: 'weekly',
        targetCount: 1,
        daysOfWeek: []
      }
    });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const currentDays = newTask.schedule.daysOfWeek || [];
    const dayIndex = currentDays.findIndex(d => d.day === day);

    if (dayIndex === -1) {
      setNewTask(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          daysOfWeek: [...currentDays, { day, time: { hour: 9, minute: 0 } }]
        }
      }));
    } else {
      setNewTask(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          daysOfWeek: currentDays.filter(d => d.day !== day)
        }
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={newTask.frequency}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setNewTask(prev => ({
                    ...prev,
                    frequency: value,
                    schedule: {
                      ...prev.schedule,
                      type: value
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCount">Target Count</Label>
              <Input
                id="targetCount"
                type="number"
                min={1}
                value={newTask.schedule.targetCount}
                onChange={(e) => setNewTask(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    targetCount: parseInt(e.target.value) || 1
                  }
                }))}
              />
            </div>

            {newTask.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = newTask.schedule.daysOfWeek?.some(d => d.day === day);
                    return (
                      <Button
                        key={day}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDayToggle(day)}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleAddTask}
            disabled={!newTask.title.trim()}
            className="w-full"
          >
            <Icons.add className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <h4 className="font-medium">{task.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    {task.frequency}
                  </Badge>
                  <span>•</span>
                  <span>{task.schedule.targetCount}x</span>
                  {task.frequency === 'weekly' && task.schedule.daysOfWeek && (
                    <>
                      <span>•</span>
                      <span>
                        {task.schedule.daysOfWeek.map(d => 
                          d.day.charAt(0).toUpperCase() + d.day.slice(1, 3)
                        ).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteTask(task.id)}
              >
                <Icons.trash className="h-4 w-4" />
                <span className="sr-only">Delete task</span>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 