import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

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
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {goalName}
        </Typography>

        <Stack spacing={3}>
          {collaborators.map((collaborator) => {
            const userTasks = getTasksByUser(collaborator.id);
            const completedTasks = userTasks.filter(task => task.status === 'completed');
            const pendingTasks = userTasks.filter(task => task.status === 'pending');

            return (
              <Box key={collaborator.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1">
                      {collaborator.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {collaborator.email}
                    </Typography>
                  </Box>
                  <Box>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${completedTasks.length} Completed`}
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {pendingTasks.length > 0 && (
                      <Chip
                        icon={<ErrorIcon />}
                        label={`${pendingTasks.length} Pending`}
                        color="warning"
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Button
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={() => handleOpenReminderDialog(collaborator.id, collaborator.name)}
                    >
                      Send Reminder
                    </Button>
                  </Box>
                </Box>

                <List>
                  {userTasks.map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemText
                        primary={task.title}
                        secondary={`Due: ${format(task.dueDate.toDate(), 'MMM d, yyyy')}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          color={task.status === 'completed' ? 'success' : 'primary'}
                          variant={task.status === 'completed' ? 'contained' : 'outlined'}
                          onClick={() => onUpdateTaskStatus(
                            goalId,
                            task.id,
                            task.status === 'completed' ? 'pending' : 'completed'
                          )}
                        >
                          {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}
        </Stack>

        <Dialog
          open={isReminderDialogOpen}
          onClose={() => setIsReminderDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Send Reminder to {selectedUser?.name}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              label="Reminder Message"
              variant="outlined"
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSendReminder}
              startIcon={<SendIcon />}
            >
              Send Reminder
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}; 