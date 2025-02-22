import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import { toast } from 'react-hot-toast';
import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Autocomplete,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import { UserProfile } from '../types';

interface AreaSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
}

interface SharedUser extends UserProfile {
  permissions: {
    edit: boolean;
    view: boolean;
  };
}

const AreaSharingModal: React.FC<AreaSharingModalProps> = ({
  isOpen,
  onClose,
  areaId,
  areaName
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'edit' | 'view'>('edit');
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const userService = getUserService();

  // Load all users and current shared users
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadData = async () => {
      try {
        // Load all users except current user
        const allUsers = await userService.findAllUsers();
        console.log('All users:', allUsers);
        setUsers(allUsers.filter(u => u.id !== currentUser.uid));

        // Load area details to get shared users
        const areaRef = doc(db, 'areas', areaId);
        const areaDoc = await getDoc(areaRef);
        
        if (areaDoc.exists()) {
          const areaData = areaDoc.data();
          console.log('Area data:', areaData);
          const sharedWithIds = areaData.sharedWith || [];
          console.log('Shared with IDs:', sharedWithIds);
          
          // Get full user profiles for shared users
          const sharedUserProfiles = await Promise.all(
            sharedWithIds.map(async (userId: string) => {
              const user = allUsers.find(u => u.id === userId);
              console.log('Found user for ID:', userId, user);
              if (!user) return null;
              
              return {
                ...user,
                permissions: areaData.permissions[userId] || { edit: false, view: true }
              };
            })
          );

          const filteredProfiles = sharedUserProfiles.filter((u): u is SharedUser => u !== null);
          console.log('Shared user profiles:', filteredProfiles);
          setSharedUsers(filteredProfiles);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load users');
      }
    };

    loadData();
  }, [isOpen, currentUser, areaId]);

  const handleShare = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      console.log('Starting share process for user:', selectedUser.id);
      const areaRef = doc(db, 'areas', areaId);
      const areaDoc = await getDoc(areaRef);
      
      if (!areaDoc.exists()) {
        throw new Error('Area not found');
      }

      const areaData = areaDoc.data();
      console.log('Current area data:', areaData);
      const currentSharedWith = areaData.sharedWith || [];
      console.log('Current sharedWith array:', currentSharedWith);
      
      // First check if the user is already in sharedWith
      if (!currentSharedWith.includes(selectedUser.id)) {
        // Add user to area's sharedWith array and set their permissions
        const updates = {
          sharedWith: arrayUnion(selectedUser.id),
          [`permissions.${selectedUser.id}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        };

        console.log('Updating area with:', updates);
        await updateDoc(areaRef, updates);
        console.log('Area updated successfully');

        // Verify the update
        const updatedDoc = await getDoc(areaRef);
        const updatedData = updatedDoc.data();
        console.log('Updated area data:', updatedData);

        // Update local state
        setSharedUsers([...sharedUsers, {
          ...selectedUser,
          permissions: {
            edit: permissionLevel === 'edit',
            view: true
          }
        }]);

        setSelectedUser(null);
        toast.success('Area shared successfully');
      } else {
        console.log('User already has access:', selectedUser.id);
        setError('This user already has access to this area');
      }
    } catch (error) {
      console.error('Error sharing area:', error);
      setError('Failed to share area');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    try {
      setIsSubmitting(true);
      const areaRef = doc(db, 'areas', areaId);
      const areaDoc = await getDoc(areaRef);
      
      if (!areaDoc.exists()) {
        throw new Error('Area not found');
      }

      const areaData = areaDoc.data();
      
      // Remove user from sharedWith and their permissions
      await updateDoc(areaRef, {
        sharedWith: areaData.sharedWith.filter((id: string) => id !== userId),
        [`permissions.${userId}`]: null
      });

      // Update local state
      setSharedUsers(sharedUsers.filter(u => u.id !== userId));
      toast.success('Access removed successfully');
    } catch (error) {
      console.error('Error removing access:', error);
      toast.error('Failed to remove access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermissions = async (userId: string, newPermissionLevel: 'edit' | 'view') => {
    try {
      setIsSubmitting(true);
      const areaRef = doc(db, 'areas', areaId);
      
      await updateDoc(areaRef, {
        [`permissions.${userId}`]: {
          edit: newPermissionLevel === 'edit',
          view: true
        }
      });

      // Update local state
      setSharedUsers(sharedUsers.map(user => 
        user.id === userId 
          ? {
              ...user,
              permissions: {
                edit: newPermissionLevel === 'edit',
                view: true
              }
            }
          : user
      ));

      toast.success('Permissions updated successfully');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
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
        <Typography variant="h6">Share Area: {areaName}</Typography>
        <IconButton onClick={onClose} size="small">
          <X />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Share with User
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Autocomplete
              options={users.filter(u => !sharedUsers.some(su => su.id === u.id))}
              getOptionLabel={(option) => `${option.email}${option.displayName ? ` (${option.displayName})` : ''}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select a user"
                  size="small"
                  fullWidth
                />
              )}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
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
              fullWidth
              sx={{ mb: 2 }}
            />

            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Permission Level</FormLabel>
              <RadioGroup
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value as 'edit' | 'view')}
              >
                <FormControlLabel 
                  value="edit" 
                  control={<Radio />} 
                  label="Can Edit (can modify area and its contents)" 
                />
                <FormControlLabel 
                  value="view" 
                  control={<Radio />} 
                  label="View Only (can only view area and its contents)" 
                />
              </RadioGroup>
            </FormControl>

            <Button
              onClick={handleShare}
              disabled={isSubmitting || !selectedUser}
              variant="contained"
              fullWidth
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Share'}
            </Button>
          </Box>

          {error && (
            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            People with Access
          </Typography>

          <List>
            {sharedUsers.map((user) => (
              <ListItem
                key={user.id}
                sx={{
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={user.email}
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <RadioGroup
                        row
                        value={user.permissions.edit ? 'edit' : 'view'}
                        onChange={(e) => handleUpdatePermissions(user.id, e.target.value as 'edit' | 'view')}
                      >
                        <FormControlLabel
                          value="edit"
                          control={<Radio size="small" />}
                          label="Can Edit"
                        />
                        <FormControlLabel
                          value="view"
                          control={<Radio size="small" />}
                          label="View Only"
                        />
                      </RadioGroup>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    onClick={() => handleRemoveAccess(user.id)}
                    color="error"
                    size="small"
                  >
                    Remove
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {sharedUsers.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 2 }}
              >
                No one has access yet
              </Typography>
            )}
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AreaSharingModal; 