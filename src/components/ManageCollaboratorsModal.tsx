import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import { toast } from 'react-hot-toast';
import { 
  onSnapshot, 
  doc, 
  collection, 
  setDoc, 
  serverTimestamp,
  getDoc,
  updateDoc,
  arrayUnion as firestoreArrayUnion,
  Timestamp as FirestoreTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  TextField,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import { UserProfile, Timestamp } from '../types';
import { now } from '../utils/date';
import { convertToFirebaseTimestamp } from '../utils/firebase';

interface PendingInvite {
  email: string;
  invitedAt: Timestamp;
}

interface ManageCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageCollaboratorsModal: React.FC<ManageCollaboratorsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const userService = getUserService();

  // Load existing collaborators and pending invites
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadCollaborators = async () => {
      try {
        // Get users from the same household/organization
        const users = await userService.findUsersInSameContext(currentUser.uid);
        setCollaborators(users);

        // Get current user's profile to check pending invites
        const userProfile = await userService.findUserByEmail(currentUser.email || '');
        if (userProfile?.pendingInvites) {
          setPendingInvites(userProfile.pendingInvites);
        }
      } catch (error) {
        console.error('Error loading collaborators:', error);
        setError('Failed to load collaborators');
      }
    };

    loadCollaborators();
  }, [isOpen, currentUser]);

  const addCollaborator = async () => {
    if (!email || !currentUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Add them as a household member which creates the invitation
      await userService.addHouseholdMember(
        currentUser.email || '',
        email
      );

      // Create a new pending invite with our custom Timestamp type
      const newInvite: PendingInvite = {
        email,
        invitedAt: now() // Using our utility to create a Timestamp
      };

      // Update the pending invites list
      setPendingInvites(prev => [...prev, newInvite]);
      
      toast.success('Invitation sent successfully');
      setEmail('');
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError('Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeCollaborator = async (userId: string) => {
    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      // Remove the sharing relationship
      await userService.updateUserProfile(currentUser.uid, {
        sharedWith: collaborators.filter(c => c.id !== userId).map(c => c.id)
      });

      // Update the local state
      setCollaborators(prev => prev.filter(c => c.id !== userId));
      toast.success('Collaborator removed');
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelInvite = async (email: string) => {
    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      // Remove the pending invite
      const updatedInvites = pendingInvites.filter(invite => invite.email !== email);
      await userService.updateUserProfile(currentUser.uid, {
        pendingInvites: updatedInvites
      });

      // Update the local state
      setPendingInvites(updatedInvites);
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Manage Collaborators</Typography>
        <IconButton onClick={onClose} size="small">
          <X />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Collaborator
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              fullWidth
              size="small"
            />
            <Button
              onClick={addCollaborator}
              disabled={isSubmitting || !email}
              variant="contained"
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Add'}
            </Button>
          </Box>
          {error && (
            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 4 }}>
            Current Collaborators
          </Typography>
          <Box sx={{ mb: 3 }}>
            {collaborators.map((user) => (
              <Box
                key={user.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}
              >
                <Box>
                  <Typography variant="body2">{user.email}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.displayName}
                  </Typography>
                </Box>
                <Button
                  onClick={() => removeCollaborator(user.id)}
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
          </Box>

          {pendingInvites.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 4 }}>
                Pending Invitations
              </Typography>
              <Box>
                {pendingInvites.map((invite) => (
                  <Box
                    key={invite.email}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      mb: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1
                    }}
                  >
                    <Box>
                      <Typography variant="body2">{invite.email}</Typography>
                      <Chip
                        label="Pending"
                        size="small"
                        color="warning"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Button
                      onClick={() => cancelInvite(invite.email)}
                      color="error"
                      size="small"
                    >
                      Cancel
                    </Button>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCollaboratorsModal; 