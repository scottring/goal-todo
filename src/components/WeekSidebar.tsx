import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Inbox as InboxIcon,
  Warning as WarningIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { WeekItem } from '../types/index';
import { WeekItemCard } from './WeekItemCard';

interface WeekSidebarProps {
  unscheduled: WeekItem[];
  inbox: WeekItem[];
  overdue: WeekItem[];
  weekGoals: WeekItem[];
  upcomingMilestones: WeekItem[];
  onItemComplete?: (itemId: string) => void;
  onItemEdit?: (itemId: string) => void;
}

export const WeekSidebar: React.FC<WeekSidebarProps> = ({
  unscheduled,
  inbox,
  overdue,
  weekGoals,
  upcomingMilestones,
  onItemComplete,
  onItemEdit
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'overdue',
    'weekGoals',
    'unscheduled'
  ]);

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleDragStart = (e: React.DragEvent, item: WeekItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const sidebarSections = [
    {
      id: 'overdue',
      title: 'Overdue',
      items: overdue,
      icon: <WarningIcon color="error" />,
      color: '#f44336',
      emptyMessage: 'No overdue items'
    },
    {
      id: 'weekGoals',
      title: 'Week Goals',
      items: weekGoals,
      icon: <FlagIcon color="primary" />,
      color: '#2196f3',
      emptyMessage: 'No goals for this week'
    },
    {
      id: 'unscheduled',
      title: 'Unscheduled',
      items: unscheduled,
      icon: <AssignmentIcon color="action" />,
      color: '#9e9e9e',
      emptyMessage: 'All tasks are scheduled'
    },
    {
      id: 'upcomingMilestones',
      title: 'Upcoming Milestones',
      items: upcomingMilestones,
      icon: <TrendingUpIcon color="warning" />,
      color: '#ff9800',
      emptyMessage: 'No upcoming milestones'
    },
    {
      id: 'inbox',
      title: 'Inbox',
      items: inbox,
      icon: <InboxIcon color="secondary" />,
      color: '#9c27b0',
      emptyMessage: 'Inbox is empty'
    }
  ];

  return (
    <Box sx={{ width: 320, height: '100%', overflow: 'auto' }}>
      {sidebarSections.map((section) => (
        <Accordion
          key={section.id}
          expanded={expandedSections.includes(section.id)}
          onChange={() => handleSectionToggle(section.id)}
          sx={{
            '&:before': { display: 'none' },
            boxShadow: 'none',
            border: '1px solid #e0e0e0',
            '&:not(:last-child)': { borderBottom: 0 }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              backgroundColor: 'background.default',
              borderLeft: `4px solid ${section.color}`,
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            {section.icon}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {section.title}
            </Typography>
            {section.items.length > 0 && (
              <Badge
                badgeContent={section.items.length}
                color="primary"
                sx={{ ml: 'auto' }}
              />
            )}
          </AccordionSummary>

          <AccordionDetails sx={{ p: 1 }}>
            {section.items.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 3,
                  color: 'text.secondary',
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2">
                  {section.emptyMessage}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.items.map((item) => (
                  <Box
                    key={item.id}
                    draggable={section.id === 'unscheduled' || section.id === 'inbox'}
                    onDragStart={(e) => handleDragStart(e, item)}
                    sx={{
                      cursor: section.id === 'unscheduled' || section.id === 'inbox' 
                        ? 'grab' : 'pointer',
                      '&:active': {
                        cursor: section.id === 'unscheduled' || section.id === 'inbox' 
                          ? 'grabbing' : 'pointer'
                      }
                    }}
                  >
                    <WeekItemCard
                      item={item}
                      onComplete={onItemComplete}
                      onEdit={onItemEdit}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Drag Instructions */}
      <Paper sx={{ m: 2, p: 2, backgroundColor: '#f5f5f5' }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          💡 <strong>Tip:</strong> Drag unscheduled items and inbox items to specific days to schedule them.
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label="🎯 Goal" size="small" />
          <Chip label="🏁 Milestone" size="small" />
          <Chip label="✓ Task" size="small" />
          <Chip label="🔄 Routine" size="small" />
          <Chip label="💡 Idea" size="small" />
        </Box>
      </Paper>
    </Box>
  );
};