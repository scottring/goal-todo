import React from 'react';
import { useHouseholdContext } from '../contexts/HouseholdContext';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface HouseholdMemberSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const HouseholdMemberSelect: React.FC<HouseholdMemberSelectProps> = ({
  value,
  onChange,
  className
}) => {
  const { householdMembers } = useHouseholdContext();

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      className={className}
      displayEmpty
    >
      <MenuItem value="">
        <em>Unassigned</em>
      </MenuItem>
      {householdMembers.map((member) => (
        <MenuItem key={member.id} value={member.id}>
          {member.name || member.email}
        </MenuItem>
      ))}
    </Select>
  );
}; 