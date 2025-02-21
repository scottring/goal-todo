import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getUserService } from '../services/UserService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface AddHouseholdMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
}

export const AddHouseholdMemberModal: React.FC<AddHouseholdMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded
}) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const userService = getUserService();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    console.log('Form submission started');
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser?.email) {
      console.log('No current user email');
      toast.error('Please sign in to add household members.');
      return;
    }

    try {
      setLoading(true);
      console.log('Adding household member:', email);
      
      await userService.addHouseholdMember(
        currentUser.email,
        email,
        displayName
      );

      console.log('Successfully added household member');
      toast.success('Household member added successfully!');
      onMemberAdded();
      onClose();
      setEmail('');
      setDisplayName('');
    } catch (error) {
      console.error('Error adding household member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add household member';
      if (errorMessage.includes('must sign up first')) {
        toast.error('This person needs to sign up for an account first before being added as a household member.');
      } else if (errorMessage.includes('Must be signed in')) {
        toast.error('Please sign in again to add household members.');
      } else {
        toast.error('Failed to add household member. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email, email, displayName, userService, onMemberAdded, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md relative" 
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">Add Household Member</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter email address"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Note: The person must have already signed up for an account with this email.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter display name (optional)"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return createPortal(modalContent, document.body);
}; 