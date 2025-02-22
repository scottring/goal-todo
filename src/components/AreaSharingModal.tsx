import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { getUserService } from '../services/UserService';
import { getEmailService } from '../services/EmailService';
import { toast } from 'react-hot-toast';
import { 
  onSnapshot, 
  doc, 
  collection, 
  setDoc, 
  serverTimestamp,
  getDoc,
  updateDoc,
  arrayUnion as firestoreArrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserProfile, 
  PermissionLevel,
  HierarchicalPermissions
} from '../types';
import {
  Autocomplete,
  TextField,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';

interface AreaSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
}

const AreaSharingModal: React.FC<AreaSharingModalProps> = ({
  isOpen,
  onClose,
  areaId,
  areaName
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { currentUser } = useAuth();
  const { updateDocument } = useFirestore();
  const userService = getUserService();

  // Load existing collaborators
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadCollaborators = async () => {
      try {
        // Get users from the same household/organization
        const users = await userService.findUsersInSameContext(currentUser.uid);
        setCollaborators(users);
      } catch (error) {
        console.error('Error loading collaborators:', error);
        setError('Failed to load collaborators');
      }
    };

    loadCollaborators();
  }, [isOpen, currentUser]);

  const handleUserSelect = (user: UserProfile | null) => {
    setSelectedUser(user);
    if (user) {
      setEmail(user.email);
    }
  };

  const addCollaborator = async (user: UserProfile) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Check if user is already a participant
      if (collaborators.some(p => p.id === user.id)) {
        setError('User is already a collaborator');
        return;
      }

      // Add user to participants
      setCollaborators(prev => [...prev, user]);
      setSelectedUser(null);

      // Send email notification
      if (currentUser) {
        await getEmailService().sendShareInvite(
          user.email,
          currentUser.email || 'unknown',
          areaName,
          areaId,
          { 
            level: 'editor',
            specificOverrides: {
              canEditTasks: true,
              canEditRoutines: true,
              canInviteUsers: false,
              canModifyPermissions: false
            }
          }
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

  const addCollaboratorByEmail = async () => {
    if (!email) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Look up user by email
      const existingUser = await userService.findUserByEmail(email);
      
      if (existingUser) {
        // If user exists, add them as a collaborator
        await addCollaborator(existingUser);
      } else {
        // If user doesn't exist, send an invitation and record the pending share
        if (currentUser) {
          // First add them as a household member which creates the invitation
          await userService.addHouseholdMember(
            currentUser.email || '',
            email
          );

          // Record the pending area share
          const pendingShareRef = doc(collection(db, 'pendingAreaShares'));
          await setDoc(pendingShareRef, {
            email: email.toLowerCase(),
            areaId,
            sharedBy: currentUser.uid,
            sharedByEmail: currentUser.email,
            createdAt: serverTimestamp(),
            permissions: {
              level: 'editor' as PermissionLevel,
              specificOverrides: {
                canEditTasks: true,
                canEditRoutines: true,
                canInviteUsers: false,
                canModifyPermissions: false
              }
            }
          });

          // Get current area data
          const areaRef = doc(db, 'areas', areaId);
          const areaDoc = await getDoc(areaRef);
          
          if (areaDoc.exists()) {
            // Update the area document with the pending share
            await updateDoc(areaRef, {
              pendingShares: firestoreArrayUnion({
                email: email.toLowerCase(),
                permissions: {
                  level: 'editor' as PermissionLevel,
                  specificOverrides: {
                    canEditTasks: true,
                    canEditRoutines: true,
                    canInviteUsers: false,
                    canModifyPermissions: false
                  }
                }
              })
            });
          }
          
          // Send email notification about the area sharing
          await getEmailService().sendShareInvite(
            email,
            currentUser.email || 'unknown',
            areaName,
            areaId,
            { 
              level: 'editor',
              specificOverrides: {
                canEditTasks: true,
                canEditRoutines: true,
                canInviteUsers: false,
                canModifyPermissions: false
              }
            }
          );

          toast.success('Invitation sent successfully');
        }
      }
      
      setEmail('');
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError('Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeParticipant = (userId: string) => {
    setCollaborators(prev => prev.filter(p => p.id !== userId));
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const areaRef = doc(db, 'areas', areaId);
      
      // Update permissions first
      const permissions = Object.fromEntries(
        collaborators.map(p => [p.id, {
          level: 'editor' as PermissionLevel,
          specificOverrides: {
            canEditTasks: true,
            canEditRoutines: true,
            canInviteUsers: false,
            canModifyPermissions: false
          }
        } as HierarchicalPermissions])
      );
      await updateDoc(areaRef, { permissions });

      // Then update sharedWith
      const sharedWith = collaborators.map(p => p.id);
      await updateDoc(areaRef, { sharedWith });

      // Finally update permission inheritance
      await updateDoc(areaRef, {
        permissionInheritance: {
          propagateToGoals: true,
          propagateToMilestones: true,
          propagateToTasks: true,
          propagateToRoutines: true
        }
      });

      toast.success('Area sharing updated');
      onClose();
    } catch (error) {
      console.error('Error saving sharing settings:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Share Area: {areaName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <Typography variant="subtitle2" gutterBottom>
              Add People
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
              <Autocomplete<UserProfile>
                options={collaborators}
                getOptionLabel={(option) => `${option.email}${option.displayName ? ` (${option.displayName})` : ''}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Or select from existing collaborators"
                    size="small"
                    fullWidth
                  />
                )}
                value={selectedUser}
                onChange={(_, newValue) => {
                  if (newValue) {
                    handleUserSelect(newValue);
                  }
                }}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography>{option.email}</Typography>
                      {option.displayName && (
                        <Typography variant="caption" color="text.secondary">
                          {option.displayName}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
              <Button
                onClick={addCollaboratorByEmail}
                disabled={isSubmitting || !email}
                variant="contained"
                fullWidth
                sx={{ mt: 1 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Add'}
              </Button>
            </Box>
            {error && (
              <Typography color="error" variant="caption">
                {error}
              </Typography>
            )}
          </div>

          <div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Collaborators will have access to all goals, tasks, and routines in this area.
            </Typography>
          </div>

          <div>
            <Typography variant="subtitle2" gutterBottom>
              Collaborators
            </Typography>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {collaborators.map((user) => (
                <Box
                  key={user.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}
                >
                  <Box>
                    <Typography variant="body2">{user.email}</Typography>
                    <Chip
                      label="Editor"
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  <Button
                    onClick={() => removeParticipant(user.id)}
                    color="error"
                    size="small"
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              {collaborators.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 2 }}
                >
                  No collaborators yet
                </Typography>
              )}
            </div>
          </div>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              variant="contained"
            >
              Save
            </Button>
          </Box>
        </div>
      </div>
    </div>
  );
};

export default AreaSharingModal; 