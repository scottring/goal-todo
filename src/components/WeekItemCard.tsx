import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { WeekItem } from '../types/index';

interface WeekItemCardProps {
  item: WeekItem;
  onComplete?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export const WeekItemCard: React.FC<WeekItemCardProps> = ({
  item,
  onComplete,
  onEdit,
  isDragging = false,
  isDragOver = false
}) => {
  const getTypeIcon = () => {
    switch (item.type) {
      case 'task':
        return '✓';
      case 'goal':
        return '🎯';
      case 'milestone':
        return '🏁';
      case 'project':
        return '📁';
      case 'routine':
        return '🔄';
      case 'inbox':
        return '💡';
      case 'calendar_event':
        return '📅';
      default:
        return '📝';
    }
  };

  const getPriorityColor = () => {
    switch (item.priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'completed':
        return '#4caf50';
      case 'in_progress':
        return '#2196f3';
      case 'overdue':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : timestamp;
    return format(date, 'HH:mm');
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <Card
      sx={{
        mb: 1,
        cursor: 'pointer',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.2s ease-in-out',
        border: isDragOver ? '2px dashed #2196f3' : '1px solid #e0e0e0',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-1px)'
        },
        position: 'relative'
      }}
      draggable
      onClick={() => onEdit?.(item.id)}
    >
      {/* Priority indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: getPriorityColor()
        }}
      />

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {/* Completion toggle */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.(item.id);
            }}
            sx={{ p: 0.5, mt: -0.5 }}
          >
            {item.status === 'completed' ? (
              <CheckCircleIcon sx={{ color: getStatusColor(), fontSize: 20 }} />
            ) : (
              <CircleIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />
            )}
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Title and type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" component="span">
                {getTypeIcon()}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  color: item.status === 'completed' ? 'text.secondary' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1
                }}
              >
                {item.title}
              </Typography>
            </Box>

            {/* Parent context */}
            {item.parentTitle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <LinkIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {item.parentTitle}
                </Typography>
              </Box>
            )}

            {/* Time and duration info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {item.startTime && (
                <Chip
                  icon={<ScheduleIcon />}
                  label={formatTime(item.startTime)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {item.estimatedDuration && (
                <Chip
                  label={formatDuration(item.estimatedDuration)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {item.isRecurring && (
                <Chip
                  label="Recurring"
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                ))}
                {item.tags.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{item.tags.length - 3} more
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Priority flag */}
          {item.priority === 'high' && (
            <Tooltip title="High Priority">
              <FlagIcon sx={{ color: getPriorityColor(), fontSize: 16 }} />
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};