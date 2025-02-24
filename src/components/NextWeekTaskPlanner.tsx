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
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { TaskPriority } from '../types';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DropResult
} from 'react-beautiful-dnd';

interface PlannedTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: Date;
}

interface NextWeekTaskPlannerProps {
  tasks: PlannedTask[];
  onAddTask: (task: Omit<PlannedTask, 'id'>) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (tasks: PlannedTask[]) => void;
}

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
] as const;

export const NextWeekTaskPlanner: React.FC<NextWeekTaskPlannerProps> = ({
  tasks,
  onAddTask,
  onDeleteTask,
  onReorderTasks
}) => {
  const [newTask, setNewTask] = useState<Omit<PlannedTask, 'id'>>({
    title: '',
    priority: 'medium',
    dueDate: new Date()
  });

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    onAddTask(newTask);
    setNewTask({
      title: '',
      priority: 'medium',
      dueDate: new Date()
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorderTasks(items);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Week's Tasks</CardTitle>
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
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: TaskPriority) => 
                  setNewTask(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Calendar
                mode="single"
                selected={newTask.dueDate}
                onSelect={(date) => date && setNewTask(prev => ({ ...prev, dueDate: date }))}
                className="rounded-md border"
              />
            </div>
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided: DraggableProvided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Icons.grip className="h-4 w-4 text-muted-foreground" />
                          <div className="space-y-1">
                            <h4 className="font-medium">{task.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge
                                variant={
                                  task.priority === 'high' ? 'destructive' :
                                  task.priority === 'medium' ? 'secondary' :
                                  'default'
                                }
                              >
                                {task.priority}
                              </Badge>
                              <span>•</span>
                              <span>{format(task.dueDate, 'MMM d, yyyy')}</span>
                            </div>
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}; 