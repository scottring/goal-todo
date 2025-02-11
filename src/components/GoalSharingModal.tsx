import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { toast } from 'react-hot-toast';

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

  const { user } = useAuth();
  const { updateDocument, addDocument } = useFirestore();

  const addCollaborator = () => {
    if (email && !sharedWith.includes(email)) {
      setSharedWith([...sharedWith, email]);
      setPermissions(prev => ({
        ...prev,
        [email]: {
          edit: false,
          view: true,
          invite: false
        }
      }));
      setEmail('');
    }
  };

  const handlePermissionChange = (email: string, permission: 'edit' | 'view' | 'invite') => {
    setPermissions(prev => ({
      ...prev,
      [email]: {
        ...prev[email],
        [permission]: !prev[email][permission]
      }
    }));
  };

  const handleShare = async () => {
    if (!goalTitle.trim() || !user) return;

    setIsSubmitting(true);
    try {
      if (goalId) {
        // Update existing goal
        await updateDocument('activities', goalId, {
          name: goalTitle,
          sharedWith,
          permissions
        });
        toast.success('Goal sharing updated successfully');
      } else {
        // Create new shared goal
        await addDocument('shared_goals', {
          name: goalTitle,
          ownerId: user.uid,
          sharedWith,
          participants: {
            [user.uid]: {
              role: 'owner',
              permissions: {
                edit: true,
                view: true,
                invite: true
              }
            },
            ...Object.fromEntries(
              sharedWith.map(email => [
                email,
                {
                  role: 'collaborator',
                  permissions: permissions[email]
                }
              ])
            )
          },
          status: 'active'
        });
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
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Invite Collaborators</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 p-2 border rounded-md"
                  />
                  <button
                    onClick={addCollaborator}
                    disabled={!email.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {sharedWith.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Permissions</h3>
                  <div className="space-y-3">
                    {sharedWith.map((email) => (
                      <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-sm font-medium">{email}</span>
                        <div className="flex gap-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[email]?.view ?? false}
                              onChange={() => handlePermissionChange(email, 'view')}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm">View</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[email]?.edit ?? false}
                              onChange={() => handlePermissionChange(email, 'edit')}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm">Edit</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={permissions[email]?.invite ?? false}
                              onChange={() => handlePermissionChange(email, 'invite')}
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