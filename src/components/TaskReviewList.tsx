import React, { useState } from 'react';
import { format } from 'date-fns';
import { TaskReviewItem } from '../types';
import { timestampToDate } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Updated interface to include onTaskAction prop with specific action types
interface TaskReviewListProps {
  tasks: TaskReviewItem[];
  onTaskAction: (taskId: string, action: 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close') => Promise<void>;
}

export const TaskReviewList = ({ tasks, onTaskAction }: TaskReviewListProps) => {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const handleAction = async (task: TaskReviewItem, action: 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close') => {
    try {
      setLoadingTaskId(task.taskId);
      await onTaskAction(task.taskId, action);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'missed':
        return 'destructive';
      case 'partial':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const renderTaskActions = (task: TaskReviewItem) => {
    const isLoading = loadingTaskId === task.taskId;

    if (task.action) {
      return (
        <p className="text-sm text-muted-foreground">
          {task.action === 'mark_completed' && 'Marked as completed'}
          {task.action === 'mark_missed' && 'Marked as missed'}
          {task.action === 'push_forward' && 'Pushed forward'}
          {task.action === 'archive' && 'Archived'}
        </p>
      );
    }

    return (
      <div className="flex gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleAction(task, 'mark_completed')}
            >
              Complete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction(task, 'push_forward')}
            >
              Push Forward
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction(task, 'mark_missed')}
            >
              Mark Missed
            </Button>
          </>
        )}
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No tasks to review for this week.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {tasks.map((task) => {
          const originalDueDate = 'toDate' in task.originalDueDate ? fromFirebaseTimestamp(task.originalDueDate as any) : task.originalDueDate;
          const completedDate = task.completedDate && 'toDate' in task.completedDate ? fromFirebaseTimestamp(task.completedDate as any) : task.completedDate;

          return (
            <Card key={task.taskId}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(task.status)}>
                        {task.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(timestampToDate(originalDueDate), 'MMM d, yyyy')}
                      </p>
                      {completedDate && (
                        <p className="text-sm text-muted-foreground">
                          Completed: {format(timestampToDate(completedDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  {renderTaskActions(task)}
                </div>
                <Separator />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}; 