import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { TaskPriority } from '../types';
import { format } from 'date-fns';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DropResult
} from 'react-beautiful-dnd';

interface PlannedTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: Date;
}

interface NextWeekTaskPlannerProps {
  tasks: PlannedTask[];
  onAddTask: (task: Omit<PlannedTask, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<PlannedTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (startIndex: number, endIndex: number) => void;
}

export const NextWeekTaskPlanner: React.FC<NextWeekTaskPlannerProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(new Date());

  const handleAddTask = () => {
    if (newTaskTitle.trim() && newTaskDueDate) {
      onAddTask({
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate
      });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate(new Date());
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorderTasks(result.source.index, result.destination.index);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'error.main';
      case 'medium':
        return 'warning.main';
      case 'low':
        return 'success.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Plan Next Week's Tasks
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Task Title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                fullWidth
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTaskPriority}
                  label="Priority"
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                >
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <DatePicker
                label="Due Date"
                value={newTaskDueDate}
                onChange={(newValue) => setNewTaskDueDate(newValue)}
                sx={{ width: 200 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || !newTaskDueDate}
              >
                Add Task
              </Button>
            </Box>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="task-list">
                {(provided: DroppableProvided) => (
                  <List
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    sx={{ width: '100%' }}
                  >
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided: DraggableProvided) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            divider
                          >
                            <IconButton {...provided.dragHandleProps} size="small">
                              <DragHandleIcon />
                            </IconButton>
                            <ListItemText
                              primary={task.title}
                              secondary={
                                <Box component="span" sx={{ display: 'flex', gap: 1 }}>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    sx={{ color: getPriorityColor(task.priority) }}
                                  >
                                    {task.priority.toUpperCase()}
                                  </Typography>
                                  <Typography component="span" variant="body2">
                                    Due: {format(task.dueDate, 'MMM d, yyyy')}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => onDeleteTask(task.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}; 