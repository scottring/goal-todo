import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, addWeeks, subWeeks, isThisWeek } from 'date-fns';
import { useWeekView } from '../hooks/useWeekView';
import { WeekDayColumn } from '../components/WeekDayColumn';
import { WeekSidebar } from '../components/WeekSidebar';
import { WeekItem } from '../types/index';

export const WeekPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null);
  
  const {
    weekData,
    loading,
    error,
    moveItemToDay,
    markItemCompleted
  } = useWeekView(selectedDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => 
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleItemComplete = (itemId: string) => {
    markItemCompleted(itemId);
  };

  const handleItemEdit = (itemId: string) => {
    // TODO: Navigate to edit page or open modal
    console.log('Edit item:', itemId);
  };

  const handleDrop = (targetDay: Date, item: WeekItem) => {
    moveItemToDay(item.id, targetDay);
    setDragOverDay(null);
  };

  const handleDragOver = (day: Date) => {
    setDragOverDay(day);
  };

  const getWeekSummary = () => {
    const totalItems = weekData.days.reduce((sum, day) => sum + day.totalItems, 0);
    const completedItems = weekData.days.reduce((sum, day) => sum + day.completedItems, 0);
    const totalTime = weekData.days.reduce((sum, day) => sum + day.totalEstimatedTime, 0);
    
    return { totalItems, completedItems, totalTime };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography>Loading week view...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography color="error">Error loading week: {error}</Typography>
      </Container>
    );
  }

  const summary = getWeekSummary();

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Week View
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={goToToday}
            disabled={isThisWeek(selectedDate)}
          >
            Today
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setSelectedDate(new Date(selectedDate))} // Force refresh
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Week Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigateWeek('prev')}>
              <ChevronLeftIcon />
            </IconButton>
            
            <Typography variant="h5" sx={{ fontWeight: 600, minWidth: 300, textAlign: 'center' }}>
              {format(weekData.weekStart, 'MMM d')} - {format(weekData.weekEnd, 'MMM d, yyyy')}
            </Typography>
            
            <IconButton onClick={() => navigateWeek('next')}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Week Summary */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {summary.totalItems > 0 && (
              <Chip
                label={`${summary.completedItems}/${summary.totalItems} completed`}
                color={summary.completedItems === summary.totalItems ? 'success' : 'default'}
                variant="outlined"
              />
            )}
            {summary.totalTime > 0 && (
              <Chip
                label={`${formatDuration(summary.totalTime)} planned`}
                variant="outlined"
              />
            )}
            <Chip
              label={`${weekData.unscheduled.length} unscheduled`}
              color={weekData.unscheduled.length > 0 ? 'warning' : 'default'}
              variant="outlined"
            />
            {weekData.overdue.length > 0 && (
              <Chip
                label={`${weekData.overdue.length} overdue`}
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <WeekSidebar
          unscheduled={weekData.unscheduled}
          inbox={weekData.inbox}
          overdue={weekData.overdue}
          weekGoals={weekData.weekGoals}
          upcomingMilestones={weekData.upcomingMilestones}
          onItemComplete={handleItemComplete}
          onItemEdit={handleItemEdit}
        />

        {/* Week Grid */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Grid container spacing={1} sx={{ height: '100%' }}>
            {weekData.days.map((day) => (
              <Grid item xs key={day.date.toISOString()} sx={{ height: '100%' }}>
                <WeekDayColumn
                  day={day}
                  onItemComplete={handleItemComplete}
                  onItemEdit={handleItemEdit}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  isDragOver={dragOverDay?.toDateString() === day.date.toDateString()}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};