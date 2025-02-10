import React, { useState } from 'react';
import { X, Users, Mail, Check } from 'lucide-react';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import type { SharedGoal } from '../types';

interface ShareModalProps {
  goalId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ goalId, isOpen, onClose }) => {
  const { sharedGoals, updatePermissions } = useSharedGoalsContext();
  const [email, setEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState({
    edit: false,
    view: true,
    invite: false
  });

  const goal = sharedGoals.find(g => g.id === goalId);
  if (!goal) return null;

  const handleShare = async () => {
    // In a real app, you would:
    // 1. Look up the user by email
    // 2. Get their userId
    // 3. Add them to the goal's participants
    const mockUserId = 'mock-user-id'; // Replace with actual user lookup
    
    try {
      await updatePermissions(goalId, mockUserId, selectedPermissions);
      setEmail('');
      setSelectedPermissions({
        edit: false,
        view: true,
        invite: false
      });
    } catch (err) {
      console.error('Error sharing goal:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Share Goal</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite by email
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <button
                onClick={handleShare}
                disabled={!email}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Permissions</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPermissions.view}
                  onChange={e => setSelectedPermissions(prev => ({
                    ...prev,
                    view: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Can view</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPermissions.edit}
                  onChange={e => setSelectedPermissions(prev => ({
                    ...prev,
                    edit: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Can edit</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPermissions.invite}
                  onChange={e => setSelectedPermissions(prev => ({
                    ...prev,
                    invite: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Can invite others</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Currently shared with</h3>
            <div className="space-y-2">
              {Object.entries(goal.participants).map(([userId, participant]) => (
                <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userId} {/* Replace with actual user info */}
                    </p>
                    <p className="text-xs text-gray-500">
                      {participant.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {participant.permissions.view && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        View
                      </span>
                    )}
                    {participant.permissions.edit && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        Edit
                      </span>
                    )}
                    {participant.permissions.invite && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        Invite
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 