import React, { useState } from 'react';
import { useHouseholdMembers } from '../hooks/useHouseholdMembers';
import { AddHouseholdMemberModal } from './AddHouseholdMemberModal';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HouseholdMemberSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export const HouseholdMemberSelect: React.FC<HouseholdMemberSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select household member',
  required = false
}) => {
  const { householdMembers, loading, error, refetch } = useHouseholdMembers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading members...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Error loading members</option>
      </select>
    );
  }

  // Separate active and pending members
  const activeMembers = householdMembers.filter(member => !member.isPending);
  const pendingMembers = householdMembers.filter(member => member.isPending);

  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        required={required}
      >
        <option value="">{placeholder}</option>
        {activeMembers.length > 0 && (
          <optgroup label="Active Members">
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName || member.email}
              </option>
            ))}
          </optgroup>
        )}
        {pendingMembers.length > 0 && (
          <optgroup label="Pending Invites">
            {pendingMembers.map((member) => {
              // Only disable if the member's email doesn't match the current user
              const isCurrentUser = currentUser?.email?.toLowerCase() === member.email?.toLowerCase();
              return (
                <option key={member.id} value={member.id} disabled={!isCurrentUser}>
                  {member.displayName || member.email} {!isCurrentUser ? '(Pending)' : '(You)'}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="p-2 text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md"
        title="Add Household Member"
      >
        <Plus className="w-5 h-5" />
      </button>
      <AddHouseholdMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMemberAdded={() => {
          refetch();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}; 