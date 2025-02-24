import React, { useState } from 'react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Send } from "lucide-react";

interface SharedTask {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: Timestamp;
  status: 'completed' | 'pending';
}

interface SharedGoalReviewProps {
  goalId: string;
  goalName: string;
  tasks: SharedTask[];
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  onSendReminder: (goalId: string, userId: string) => void;
  onUpdateTaskStatus: (goalId: string, taskId: string, status: 'completed' | 'pending') => void;
}

export const SharedGoalReview: React.FC<SharedGoalReviewProps> = ({
  goalId,
  goalName,
  tasks,
  collaborators,
  onSendReminder,
  onUpdateTaskStatus
}) => {
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');

  const handleOpenReminderDialog = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setReminderMessage(`Hi ${userName}, just checking in on the progress of your tasks for ${goalName}.`);
    setIsReminderDialogOpen(true);
  };

  const handleSendReminder = () => {
    if (selectedUser) {
      onSendReminder(goalId, selectedUser.id);
      setIsReminderDialogOpen(false);
      setSelectedUser(null);
      setReminderMessage('');
    }
  };

  const getTasksByUser = (userId: string) => {
    return tasks.filter(task => task.assignedTo === userId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goalName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ScrollArea className="h-[500px] pr-4">
          {collaborators.map((collaborator) => {
            const userTasks = getTasksByUser(collaborator.id);
            const completedTasks = userTasks.filter(task => task.status === 'completed');
            const pendingTasks = userTasks.filter(task => task.status === 'pending');

            return (
              <div key={collaborator.id} className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium">{collaborator.name}</h3>
                    <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {completedTasks.length} Completed
                    </Badge>
                    {pendingTasks.length > 0 && (
                      <Badge variant="outline" className="bg-yellow-50">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {pendingTasks.length} Pending
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReminderDialog(collaborator.id, collaborator.name)}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send Reminder
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {userTasks.map((task) => (
                    <div key={task.id} className="flex justify-between items-center p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(task.dueDate.toDate(), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant={task.status === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onUpdateTaskStatus(
                          goalId,
                          task.id,
                          task.status === 'completed' ? 'pending' : 'completed'
                        )}
                      >
                        {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            );
          })}
        </ScrollArea>

        <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
          <DialogHeader>
            <DialogTitle>Send Reminder to {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <Textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="Enter your reminder message..."
              className="min-h-[150px]"
            />
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder}>
              <Send className="w-4 h-4 mr-1" />
              Send Reminder
            </Button>
          </DialogFooter>
        </Dialog>
      </CardContent>
    </Card>
  );
}; 