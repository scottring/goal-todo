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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {goalId ? 'Share Goal' : 'Create Shared Goal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Goal Title"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={sharingEnabled}
              onChange={(e) => setSharingEnabled(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Share this goal with others</span>
          </label>

          {sharingEnabled && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addCollaborator}
                  disabled={!email || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {participants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Permissions</h3>
                  <div className="space-y-3">
                    {participants.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <span className="text-sm font-medium">{user.email}</span>
                          {user.displayName && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({user.displayName})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[user.id]?.view ?? false}
                              onChange={() => handlePermissionChange(user.id, 'view')}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm">View</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[user.id]?.edit ?? false}
                              onChange={() => handlePermissionChange(user.id, 'edit')}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm">Edit</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[user.id]?.invite ?? false}
                              onChange={() => handlePermissionChange(user.id, 'invite')}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm">Invite</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!goalTitle.trim() || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {goalId ? 'Update Sharing' : 'Share Goal'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalSharingModal; 