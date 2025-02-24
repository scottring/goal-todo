import React, { useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import { WeeklyPlanningSession } from '../types';
import { format } from 'date-fns';
import { timestampToDate } from '../utils/date';
import { fromFirebaseTimestamp } from '../utils/firebase-adapter';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WeeklyPlanSummaryProps {
  session: WeeklyPlanningSession;
  onSyncCalendar: () => Promise<void>;
}

export const WeeklyPlanSummary: React.FC<WeeklyPlanSummaryProps> = ({
  session,
  onSyncCalendar
}) => {
  const { goals } = useGoalsContext();
  const {
    reviewPhase,
    planningPhase,
    weekStartDate,
    weekEndDate
  } = session;

  // Find routine details from goals
  const routineDetails = useMemo(() => {
    const details: Record<string, { title: string; goalName: string }> = {};
    goals.forEach(goal => {
      goal.routines.forEach(routine => {
        if ('id' in routine) {
          details[routine.id] = {
            title: routine.title,
            goalName: goal.name
          };
        }
      });
    });
    return details;
  }, [goals]);

  // Calculate review statistics from taskReviews
  const reviewStats = useMemo(() => {
    const stats = {
      completed: 0,
      pushed: 0,
      missed: 0
    };

    reviewPhase.taskReviews.forEach(task => {
      if (task.action === 'mark_completed' || task.status === 'completed') {
        stats.completed++;
      } else if (task.action === 'push_forward') {
        stats.pushed++;
      } else if (task.action === 'mark_missed' || task.status === 'missed') {
        stats.missed++;
      }
    });

    return stats;
  }, [reviewPhase.taskReviews]);

  // Convert timestamps if they are Firebase timestamps
  const startDate = 'toDate' in weekStartDate ? fromFirebaseTimestamp(weekStartDate as any) : weekStartDate;
  const endDate = 'toDate' in weekEndDate ? fromFirebaseTimestamp(weekEndDate as any) : weekEndDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Plan Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(timestampToDate(startDate), 'MMM d')} - {format(timestampToDate(endDate), 'MMM d, yyyy')}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Previous Week Review Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-2xl font-bold">{reviewStats.completed}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tasks Pushed Forward</p>
              <p className="text-2xl font-bold">{reviewStats.pushed}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tasks Missed</p>
              <p className="text-2xl font-bold">{reviewStats.missed}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Next Week's Plan</h3>
          <div className="space-y-2">
            {planningPhase.nextWeekTasks.map((task) => {
              const taskDetails = reviewPhase.taskReviews.find(
                review => review.taskId === task.taskId
              );
              const dueDate = 'toDate' in task.dueDate ? fromFirebaseTimestamp(task.dueDate as any) : task.dueDate;
              
              return (
                <div key={task.taskId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{taskDetails?.title || 'Unknown Task'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(timestampToDate(dueDate), 'MMM d')}
                    </p>
                  </div>
                  <Badge variant={
                    task.priority === 'high' ? 'destructive' :
                    task.priority === 'medium' ? 'secondary' :
                    'default'
                  }>
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
            {planningPhase.nextWeekTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tasks scheduled for next week
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Habits and Routines</h3>
          <div className="space-y-2">
            {planningPhase.recurringTasks.map((task) => {
              const routineInfo = routineDetails[task.routineId];
              return (
                <div key={task.routineId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{routineInfo?.title || 'Unknown Routine'}</p>
                    {routineInfo?.goalName && (
                      <p className="text-sm text-muted-foreground">{routineInfo.goalName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {`${task.frequency} | ${task.schedule.targetCount}x per ${task.frequency}`}
                    </p>
                  </div>
                  {task.schedule.daysOfWeek?.[0]?.time && (
                    <Badge variant="outline">
                      {`${String(task.schedule.daysOfWeek[0].time.hour).padStart(2, '0')}:${String(task.schedule.daysOfWeek[0].time.minute).padStart(2, '0')}`}
                    </Badge>
                  )}
                </div>
              );
            })}
            {planningPhase.recurringTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No habits or routines scheduled
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Calendar Sync Status</h3>
          {planningPhase.calendarSyncStatus.synced ? (
            <div className="flex items-center gap-2">
              <Badge variant="default">Synced</Badge>
              <p className="text-sm text-muted-foreground">
                Last synced: {planningPhase.calendarSyncStatus.lastSyncedAt && format(
                  timestampToDate(
                    'toDate' in planningPhase.calendarSyncStatus.lastSyncedAt 
                      ? fromFirebaseTimestamp(planningPhase.calendarSyncStatus.lastSyncedAt as any)
                      : planningPhase.calendarSyncStatus.lastSyncedAt
                  ),
                  'MMM d, h:mm a'
                )}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={onSyncCalendar}
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Sync with Calendar
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Next Steps</h3>
          <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
            <li>Review your calendar for any conflicts</li>
            <li>Set up notifications for high-priority tasks</li>
            <li>Share your plan with your accountability partner</li>
            <li>Block time for deep work sessions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyPlanSummary; 