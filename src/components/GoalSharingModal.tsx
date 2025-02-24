import React, { useState, useEffect } from 'react';
import { X, Check, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { getUserService } from '../services/UserService';
import { getEmailService } from '../services/EmailService';
import { toast } from 'react-hot-toast';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface GoalSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId?: string;
  initialTitle?: string;
}

const GoalSharingModal: React.FC<GoalSharingModalProps> = ({
  isOpen,
  onClose,
  goalId,
  initialTitle = ''
}) => {
  const [goalTitle, setGoalTitle] = useState(initialTitle);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<{
    [email: string]: {
      edit: boolean;
      view: boolean;
      invite: boolean;
    }
  }>({});
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const { updateDocument, addDocument } = useFirestore();
  const userService = getUserService();

  // Set up real-time listener for goal updates
  useEffect(() => {
    if (!goalId || !isOpen) return;

    const unsubscribe = onSnapshot(doc(db, 'shared_goals', goalId), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSharedWith(data.sharedWith || []);
          setPermissions(data.permissions || {});
          
          // Update participants list
          userService.findUsersByIds(data.sharedWith)
            .then(users => setParticipants(users))
            .catch(console.error);
        }
      },
      (error) => {
        console.error('Error listening to goal updates:', error);
        setError('Failed to get real-time updates');
      }
    );

    return () => unsubscribe();
  }, [goalId, isOpen]);

  const addCollaborator = async () => {
    if (!email || sharedWith.includes(email)) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Look up user by email
      const user = await userService.findUserByEmail(email);
      if (!user) {
        setError('User not found');
        return;
      }

      // Add user to shared list
      const updatedSharedWith = [...sharedWith, user.id];
      const updatedPermissions = {
        ...permissions,
        [user.id]: {
          edit: false,
          view: true,
          invite: false
        }
      };

      setSharedWith(updatedSharedWith);
      setPermissions(updatedPermissions);
      setEmail('');

      // Send email notification
      if (currentUser) {
        try {
          await getEmailService().sendShareInvite(
            email,
            currentUser.email || 'unknown',
            goalTitle,
            goalId || '',
            updatedPermissions[user.id]
          );
        } catch (error) {
          console.error('Failed to send email notification:', error);
          // Don't block the sharing process if email fails
        }
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError('Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = async (userId: string, permission: 'edit' | 'view' | 'invite') => {
    const updatedPermissions = {
      ...permissions,
      [userId]: {
        ...permissions[userId],
        [permission]: !permissions[userId][permission]
      }
    };

    setPermissions(updatedPermissions);

    // If this is an existing goal, update permissions immediately
    if (goalId) {
      try {
        await updateDocument('shared_goals', goalId, {
          permissions: updatedPermissions
        });

        // Find user email for notification
        const user = participants.find(p => p.id === userId);
        if (user && currentUser) {
          try {
            await getEmailService().sendCollaboratorUpdate(
              user.email,
              currentUser.email || 'unknown',
              goalTitle,
              goalId,
              'goal_updated'
            );
          } catch (error) {
            console.error('Failed to send permission update notification:', error);
          }
        }
      } catch (error) {
        console.error('Error updating permissions:', error);
        toast.error('Failed to update permissions');
      }
    }
  };

  const handleShare = async () => {
    if (!goalTitle.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      if (goalId) {
        // Update existing goal
        await updateDocument('shared_goals', goalId, {
          name: goalTitle,
          sharedWith,
          permissions
        });

        // Send update notifications
        await Promise.all(
          participants.map(user => 
            getEmailService().sendCollaboratorUpdate(
              user.email,
              currentUser.email || 'unknown',
              goalTitle,
              goalId,
              'goal_updated'
            )
          )
        );

        toast.success('Goal sharing updated successfully');
      } else {
        // Create new shared goal
        const newGoalId = await addDocument('shared_goals', {
          name: goalTitle,
          ownerId: currentUser.uid,
          sharedWith,
          participants: {
            [currentUser.uid]: {
              role: 'owner',
              permissions: {
                edit: true,
                view: true,
                invite: true
              }
            },
            ...Object.fromEntries(
              sharedWith.map(userId => [
                userId,
                {
                  role: 'collaborator',
                  permissions: permissions[userId]
                }
              ])
            )
          },
          status: 'active'
        });

        // Send share invites
        await Promise.all(
          participants.map(user =>
            getEmailService().sendShareInvite(
              user.email,
              currentUser.email || 'unknown',
              goalTitle,
              newGoalId,
              permissions[user.id]
            )
          )
        );

        toast.success('Goal shared successfully');
      }
      
      setGoalTitle('');
      setSharingEnabled(false);
      setSharedWith([]);
      setPermissions({});
      onClose();
    } catch (error) {
      console.error('Error sharing goal:', error);
      toast.error('Failed to share goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="goalTitle">Goal Title</Label>
            <Input
              id="goalTitle"
              value={goalTitle}
              onChange={e => setGoalTitle(e.target.value)}
              placeholder="Enter goal title"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="email">Add Collaborators</Label>
              <div className="flex-1 space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1"
                />
                <Button
                  onClick={addCollaborator}
                  disabled={isSubmitting || !email}
                  variant="secondary"
                >
                  Add
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {participants.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {participants.map(participant => (
                      <div key={participant.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{participant.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`view-${participant.id}`}
                              checked={permissions[participant.id]?.view}
                              onCheckedChange={() => handlePermissionChange(participant.id, 'view')}
                            />
                            <Label htmlFor={`view-${participant.id}`}>View</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${participant.id}`}
                              checked={permissions[participant.id]?.edit}
                              onCheckedChange={() => handlePermissionChange(participant.id, 'edit')}
                            />
                            <Label htmlFor={`edit-${participant.id}`}>Edit</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`invite-${participant.id}`}
                              checked={permissions[participant.id]?.invite}
                              onCheckedChange={() => handlePermissionChange(participant.id, 'invite')}
                            />
                            <Label htmlFor={`invite-${participant.id}`}>Invite</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSubmitting || !goalTitle.trim()}
          >
            Share Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalSharingModal; 