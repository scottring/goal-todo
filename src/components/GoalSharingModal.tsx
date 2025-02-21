import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { getUserService } from '../services/UserService';
import { getEmailService } from '../services/EmailService';
import { toast } from 'react-hot-toast';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserProfile, 
  HierarchicalPermissions, 
  PermissionLevel
} from '../types';

interface GoalSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId?: string;
  initialTitle?: string;
  areaId?: string;
}

const GoalSharingModal: React.FC<GoalSharingModalProps> = ({
  isOpen,
  onClose,
  goalId,
  initialTitle = '',
  areaId
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inheritToSubItems, setInheritToSubItems] = useState(true);

  const { currentUser } = useAuth();
  const { updateDocument, addDocument } = useFirestore();
  const userService = getUserService();

  useEffect(() => {
    if (!goalId || !isOpen) return;

    const unsubscribe = onSnapshot(doc(db, 'shared_goals', goalId), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Update participants list
          userService.findUsersByIds(data.sharedWith || [])
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
    if (!email) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Look up user by email
      const user = await userService.findUserByEmail(email);
      if (!user) {
        setError('User not found');
        return;
      }

      // Check if user is already a participant
      if (participants.some(p => p.id === user.id)) {
        setError('User is already a collaborator');
        return;
      }

      const newPermissions: HierarchicalPermissions = {
        level: 'editor',
        specificOverrides: {
          canEditTasks: true,
          canEditRoutines: true
        }
      };

      // Add user to participants
      setParticipants(prev => [...prev, user]);
      setEmail('');

      // Send email notification
      if (currentUser) {
        await getEmailService().sendShareInvite(
          email,
          currentUser.email || 'unknown',
          initialTitle,
          goalId || '',
          newPermissions
        );
        toast.success('Invitation sent successfully');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError('Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeParticipant = (userId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== userId));
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const sharedWith = participants.map(p => p.id);
      const permissions = Object.fromEntries(
        participants.map(p => [p.id, {
          level: 'editor' as PermissionLevel,
          specificOverrides: {
            canEditTasks: true,
            canEditRoutines: true
          }
        }])
      );

      if (goalId) {
        await updateDocument('shared_goals', goalId, {
          sharedWith,
          permissions,
          inheritToSubItems
        });
      }

      toast.success('Sharing settings saved');
      onClose();
    } catch (error) {
      console.error('Error saving sharing settings:', error);
      toast.error('Failed to save sharing settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Share Goal</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add People
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={addCollaborator}
                disabled={isSubmitting || !email}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inheritToSubItems}
                onChange={(e) => setInheritToSubItems(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Apply these permissions to all tasks and routines</span>
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Collaborators</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participants.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-sm">{user.email}</span>
                  <button
                    onClick={() => removeParticipant(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No collaborators yet
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalSharingModal; 