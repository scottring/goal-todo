import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import { toast } from 'react-hot-toast';
import { doc, updateDoc, getDoc, arrayUnion, query, collection, where, getDocs } from 'firebase/firestore';
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
  Alert
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

        // Propagate permissions to all goals in this area
        await propagatePermissionsToChildren(areaId, selectedUser.id, permissionLevel);

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

  // Helper function to propagate permissions to all child items
  const propagatePermissionsToChildren = async (
    areaId: string, 
    userId: string, 
    permissionLevel: 'edit' | 'view'
  ) => {
    try {
      console.log(`Propagating ${permissionLevel} permissions for user ${userId} to all items in area ${areaId}`);
      
      // 1. Update all goals in this area
      const goalsQuery = query(
        collection(db, 'activities'),
        where('areaId', '==', areaId)
      );
      
      const goalsSnapshot = await getDocs(goalsQuery);
      console.log(`Found ${goalsSnapshot.size} goals to update`);
      
      const goalUpdates = goalsSnapshot.docs.map(async (goalDoc) => {
        console.log(`Updating goal: ${goalDoc.id}`);
        return updateDoc(doc(db, 'activities', goalDoc.id), {
          sharedWith: arrayUnion(userId),
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // 2. Update all tasks in this area
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('areaId', '==', areaId)
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      console.log(`Found ${tasksSnapshot.size} tasks to update`);
      
      const taskUpdates = tasksSnapshot.docs.map(async (taskDoc) => {
        console.log(`Updating task: ${taskDoc.id}`);
        return updateDoc(doc(db, 'tasks', taskDoc.id), {
          sharedWith: arrayUnion(userId),
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // 3. Update all routines in this area
      const routinesQuery = query(
        collection(db, 'routines'),
        where('areaId', '==', areaId)
      );
      
      const routinesSnapshot = await getDocs(routinesQuery);
      console.log(`Found ${routinesSnapshot.size} routines to update`);
      
      const routineUpdates = routinesSnapshot.docs.map(async (routineDoc) => {
        console.log(`Updating routine: ${routineDoc.id}`);
        return updateDoc(doc(db, 'routines', routineDoc.id), {
          sharedWith: arrayUnion(userId),
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // Wait for all updates to complete
      await Promise.all([...goalUpdates, ...taskUpdates, ...routineUpdates]);
      console.log('Successfully propagated permissions to all child items');
    } catch (error) {
      console.error('Error propagating permissions:', error);
      throw new Error('Failed to propagate permissions to all items in this area');
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

      // Remove permissions from all child items
      await removePermissionsFromChildren(areaId, userId);

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

  // Helper function to remove permissions from all child items
  const removePermissionsFromChildren = async (areaId: string, userId: string) => {
    try {
      console.log(`Removing permissions for user ${userId} from all items in area ${areaId}`);
      
      // 1. Update all goals in this area
      const goalsQuery = query(
        collection(db, 'activities'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const goalsSnapshot = await getDocs(goalsQuery);
      console.log(`Found ${goalsSnapshot.size} goals to update`);
      
      const goalUpdates = goalsSnapshot.docs.map(async (goalDoc) => {
        const goalData = goalDoc.data();
        console.log(`Removing access from goal: ${goalDoc.id}`);
        return updateDoc(doc(db, 'activities', goalDoc.id), {
          sharedWith: goalData.sharedWith.filter((id: string) => id !== userId),
          [`permissions.${userId}`]: null
        });
      });
      
      // 2. Update all tasks in this area
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      console.log(`Found ${tasksSnapshot.size} tasks to update`);
      
      const taskUpdates = tasksSnapshot.docs.map(async (taskDoc) => {
        const taskData = taskDoc.data();
        console.log(`Removing access from task: ${taskDoc.id}`);
        return updateDoc(doc(db, 'tasks', taskDoc.id), {
          sharedWith: taskData.sharedWith.filter((id: string) => id !== userId),
          [`permissions.${userId}`]: null
        });
      });
      
      // 3. Update all routines in this area
      const routinesQuery = query(
        collection(db, 'routines'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const routinesSnapshot = await getDocs(routinesQuery);
      console.log(`Found ${routinesSnapshot.size} routines to update`);
      
      const routineUpdates = routinesSnapshot.docs.map(async (routineDoc) => {
        const routineData = routineDoc.data();
        console.log(`Removing access from routine: ${routineDoc.id}`);
        return updateDoc(doc(db, 'routines', routineDoc.id), {
          sharedWith: routineData.sharedWith.filter((id: string) => id !== userId),
          [`permissions.${userId}`]: null
        });
      });
      
      // Wait for all updates to complete
      await Promise.all([...goalUpdates, ...taskUpdates, ...routineUpdates]);
      console.log('Successfully removed permissions from all child items');
    } catch (error) {
      console.error('Error removing permissions from children:', error);
      throw new Error('Failed to remove permissions from all items in this area');
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

      // Update permissions for all child items
      await updatePermissionsForChildren(areaId, userId, newPermissionLevel);

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

  // Helper function to update permissions for all child items
  const updatePermissionsForChildren = async (
    areaId: string, 
    userId: string, 
    permissionLevel: 'edit' | 'view'
  ) => {
    try {
      console.log(`Updating permissions to ${permissionLevel} for user ${userId} for all items in area ${areaId}`);
      
      // 1. Update all goals in this area
      const goalsQuery = query(
        collection(db, 'activities'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const goalsSnapshot = await getDocs(goalsQuery);
      console.log(`Found ${goalsSnapshot.size} goals to update`);
      
      const goalUpdates = goalsSnapshot.docs.map(async (goalDoc) => {
        console.log(`Updating permissions for goal: ${goalDoc.id}`);
        return updateDoc(doc(db, 'activities', goalDoc.id), {
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // 2. Update all tasks in this area
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      console.log(`Found ${tasksSnapshot.size} tasks to update`);
      
      const taskUpdates = tasksSnapshot.docs.map(async (taskDoc) => {
        console.log(`Updating permissions for task: ${taskDoc.id}`);
        return updateDoc(doc(db, 'tasks', taskDoc.id), {
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // 3. Update all routines in this area
      const routinesQuery = query(
        collection(db, 'routines'),
        where('areaId', '==', areaId),
        where('sharedWith', 'array-contains', userId)
      );
      
      const routinesSnapshot = await getDocs(routinesQuery);
      console.log(`Found ${routinesSnapshot.size} routines to update`);
      
      const routineUpdates = routinesSnapshot.docs.map(async (routineDoc) => {
        console.log(`Updating permissions for routine: ${routineDoc.id}`);
        return updateDoc(doc(db, 'routines', routineDoc.id), {
          [`permissions.${userId}`]: {
            edit: permissionLevel === 'edit',
            view: true
          }
        });
      });
      
      // Wait for all updates to complete
      await Promise.all([...goalUpdates, ...taskUpdates, ...routineUpdates]);
      console.log('Successfully updated permissions for all child items');
    } catch (error) {
      console.error('Error updating permissions for children:', error);
      throw new Error('Failed to update permissions for all items in this area');
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