import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress
} from '@mui/material';
import { format } from 'date-fns';
import { WeekDay, WeekItem } from '../types/index';
import { WeekItemCard } from './WeekItemCard';

interface WeekDayColumnProps {
  day: WeekDay;
  onItemComplete?: (itemId: string) => void;
  onItemEdit?: (itemId: string) => void;
  onDrop?: (day: Date, item: WeekItem) => void;
  onDragOver?: (day: Date) => void;
  isDragOver?: boolean;
}

export const WeekDayColumn: React.FC<WeekDayColumnProps> = ({
  day,
  onItemComplete,
  onItemEdit,
  onDrop,
  onDragOver,
  isDragOver = false
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const getProgressColor = () => {
    const completionRate = day.totalItems > 0 ? day.completedItems / day.totalItems : 0;
    if (completionRate >= 0.8) return 'success';
    if (completionRate >= 0.5) return 'warning';
    return 'error';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(day.date);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemData = e.dataTransfer.getData('application/json');
    if (itemData) {
      try {
        const item = JSON.parse(itemData);
        onDrop?.(day.date, item);
      } catch (error) {
        console.error('Error parsing dropped item:', error);
      }
    }
  };

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        border: isDragOver ? '2px dashed #2196f3' : '1px solid #e0e0e0',
        backgroundColor: isDragOver ? '#f3f9ff' : 'background.paper'
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Day Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: day.isToday ? '#e3f2fd' : 'background.default'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {day.dayName}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: day.isToday ? 'primary.main' : day.isPast ? 'text.secondary' : 'text.primary'
            }}
          >
            {format(day.date, 'd')}
          </Typography>
        </Box>

        {/* Day Stats */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {day.totalItems > 0 && (
            <Chip
              label={`${day.completedItems}/${day.totalItems}`}
              size="small"
              color={getProgressColor()}
              variant="outlined"
            />
          )}
          {day.totalEstimatedTime > 0 && (
            <Chip
              label={formatDuration(day.totalEstimatedTime)}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Progress Bar */}
        {day.totalItems > 0 && (
          <LinearProgress
            variant="determinate"
            value={(day.completedItems / day.totalItems) * 100}
            color={getProgressColor()}
            sx={{ height: 4, borderRadius: 2 }}
          />
        )}
      </Box>

      {/* Items List */}
      <Box sx={{ p: 1, flexGrow: 1, overflow: 'auto' }}>
        {day.items.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100px',
              color: 'text.secondary',
              textAlign: 'center'
            }}
          >
            <Typography variant="body2">
              {day.isPast ? 'No items scheduled' : 'Drop items here'}
            </Typography>
          </Box>
        ) : (
          day.items.map((item) => (
            <WeekItemCard
              key={item.id}
              item={item}
              onComplete={onItemComplete}
              onEdit={onItemEdit}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};