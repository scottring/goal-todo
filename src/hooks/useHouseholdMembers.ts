import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import type { UserProfile } from '../types';

export interface HouseholdMember {
  id: string;
  email: string;
  displayName?: string;
  isPending?: boolean;
}

export const useHouseholdMembers = () => {
  const { currentUser } = useAuth();
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userService = getUserService();

  const fetchHouseholdMembers = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      // Get the current user's profile first
      const currentUserProfile = await userService.findUserByEmail(currentUser.email || '');
      if (!currentUserProfile) return;

      // Get all users that this person shares with
      const members = await userService.findUsersByIds(currentUserProfile.sharedWith);
      
      // Convert UserProfiles to HouseholdMembers
      const activeMembers: HouseholdMember[] = [
        {
          id: currentUserProfile.id,
          email: currentUserProfile.email,
          displayName: currentUserProfile.displayName
        },
        ...members.map(member => ({
          id: member.id,
          email: member.email,
          displayName: member.displayName
        }))
      ];

      // Add pending invites if any
      const pendingMembers: HouseholdMember[] = (currentUserProfile.pendingInvites || []).map(invite => ({
        id: invite.email, // Use email as temporary ID
        email: invite.email,
        displayName: invite.email.split('@')[0],
        isPending: true
      }));

      setHouseholdMembers([...activeMembers, ...pendingMembers]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching household members:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchHouseholdMembers();
  }, [fetchHouseholdMembers]);

  return {
    householdMembers,
    loading,
    error,
    refetch: fetchHouseholdMembers
  };
}; 