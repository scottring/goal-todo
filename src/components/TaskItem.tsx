import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Task, SourceActivity } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  activity: SourceActivity;
  onToggle: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, activity, onToggle }) => {
  return (
    <Card className="mb-2 transition-all hover:shadow-md">
      <CardContent className="flex items-center p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(task.id)}
          className="h-6 w-6 p-0"
          aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
        >
          {task.completed ? (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </Button>
        
        <div className="ml-3 flex-grow">
          <h3 className={cn(
            "text-lg",
            task.completed && "text-muted-foreground line-through"
          )}>
            {task.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{activity.name}</span>
            <span className={cn(
              "text-xs px-2 py-1 rounded-md",
              task.priority === 'high' && "bg-destructive/10 text-destructive",
              task.priority === 'medium' && "bg-yellow-100 text-yellow-800",
              task.priority === 'low' && "bg-primary/10 text-primary"
            )}>
              {task.priority}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskItem;