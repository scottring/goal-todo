import React, { useState } from 'react';
import { useProjectsContext } from '../contexts/ProjectsContext';
import { useAreasContext } from '../contexts/AreasContext';
import { Plus, Pencil, Trash2, Share2, Calendar, Target, Circle } from 'lucide-react';
import type { Project, ProjectStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  Chip,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-hot-toast';
import PageContainer from '../components/PageContainer';

const statusColors = {
  planning: '#9e9e9e',
  active: '#4caf50',
  on_hold: '#ff9800',
  completed: '#2196f3',
  cancelled: '#f44336'
};

const statusLabels = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export default function ProjectsPage() {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjectsContext();
  const { areas } = useAreasContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning' as ProjectStatus,
    color: '#3a86ff',
    areaId: '',
    progress: 0,
    tags: [] as string[]
  });
  const navigate = useNavigate();
  const theme = useTheme();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const newProject = {
        name: formData.name.trim(),
        description: formData.description,
        status: formData.status,
        color: formData.color,
        areaId: formData.areaId || undefined,
        sharedWith: [],
        permissions: {},
        permissionInheritance: {
          propagateToGoals: true,
          propagateToMilestones: true,
          propagateToTasks: true,
          propagateToRoutines: true,
        },
        progress: formData.progress,
        tags: formData.tags,
      };
      console.log('Creating new project:', newProject);
      await createProject(newProject);
      console.log('Project created successfully');
      setFormData({ 
        name: '', 
        description: '', 
        status: 'planning', 
        color: '#3a86ff', 
        areaId: '', 
        progress: 0, 
        tags: [] 
      });
      setIsCreating(false);
      toast.success('Project created successfully!');
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project. Please try again.');
    }
  };

  const handleEdit = (project: Project) => {
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      color: project.color || '#3a86ff',
      areaId: project.areaId || '',
      progress: project.progress || 0,
      tags: project.tags || []
    });
    setEditingProjectId(project.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;

    try {
      await updateProject(editingProjectId, {
        name: formData.name.trim(),
        description: formData.description,
        status: formData.status,
        color: formData.color,
        areaId: formData.areaId || undefined,
        progress: formData.progress,
        tags: formData.tags
      });
      setFormData({ 
        name: '', 
        description: '', 
        status: 'planning', 
        color: '#3a86ff', 
        areaId: '', 
        progress: 0, 
        tags: [] 
      });
      setIsEditing(false);
      setEditingProjectId(null);
      toast.success('Project updated successfully!');
    } catch (err) {
      console.error('Error updating project:', err);
      toast.error('Failed to update project. Please try again.');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        toast.success('Project deleted successfully!');
      } catch (err) {
        console.error('Error deleting project:', err);
        // More specific error message for permission issues
        if (err instanceof Error && err.message.includes('permissions')) {
          toast.error('Project removed from view (Firebase permissions pending)');
        } else {
          toast.error('Failed to delete project. Please try again.');
        }
      }
    }
  };

  const handleCardClick = (projectId: string, event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest('button')) {
      navigate(`/projects/${projectId}`);
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingProjectId(null);
    setFormData({ 
      name: '', 
      description: '', 
      status: 'planning', 
      color: '#3a86ff', 
      areaId: '', 
      progress: 0, 
      tags: [] 
    });
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, submitText: string) => (
    <Dialog 
      open={true} 
      onClose={resetForm}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <form onSubmit={onSubmit}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, fontWeight: 'bold' }}>
          {title}
          <IconButton
            onClick={resetForm}
            size="small"
            sx={{ color: theme.palette.text.secondary }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              autoFocus
              variant="outlined"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
                    label="Status"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Circle size={8} fill={statusColors[value as ProjectStatus] || statusColors.planning} color={statusColors[value as ProjectStatus] || statusColors.planning} />
                          {label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Area (Optional)</InputLabel>
                  <Select
                    value={formData.areaId}
                    onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
                    label="Area (Optional)"
                  >
                    <MenuItem value="">
                      <em>No Area</em>
                    </MenuItem>
                    {areas.map(area => (
                      <MenuItem key={area.id} value={area.id}>
                        {area.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Progress: {formData.progress}%</Typography>
              <TextField
                type="range"
                value={formData.progress}
                onChange={e => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                fullWidth
                inputProps={{ min: 0, max: 100, step: 5 }}
                variant="outlined"
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Color</Typography>
              <TextField
                type="color"
                value={formData.color}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                fullWidth
                variant="outlined"
                sx={{ 
                  '& .MuiOutlinedInput-input': { 
                    p: 1, 
                    height: 40 
                  } 
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={resetForm}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            startIcon={isEditing ? <Pencil size={18} /> : <Plus size={18} />}
          >
            {submitText}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );

  const renderProjectCards = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading projects: {error instanceof Error ? error.message : String(error)}
        </Alert>
      );
    }

    if (!projects || projects.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first project to get started
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setIsCreating(true)}
            startIcon={<Plus size={18} />}
          >
            Create Project
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {projects.filter(project => project && project.id).map(project => {
          // Ensure project has valid status
          const safeProject = {
            ...project,
            status: project.status || 'planning' as ProjectStatus,
            progress: project.progress || 0
          };
          return (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'visible',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '8px',
                  backgroundColor: safeProject.color || theme.palette.primary.main,
                  borderTopLeftRadius: theme.shape.borderRadius,
                  borderTopRightRadius: theme.shape.borderRadius,
                }
              }}
              onClick={(e) => handleCardClick(safeProject.id, e)}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
                    {safeProject.name}
                  </Typography>
                  <Chip 
                    size="small" 
                    label={statusLabels[safeProject.status] || 'Unknown'}
                    sx={{ 
                      backgroundColor: alpha(statusColors[safeProject.status] || statusColors.planning, 0.1),
                      color: statusColors[safeProject.status] || statusColors.planning,
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }} 
                  />
                </Box>
                
                {safeProject.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {safeProject.description}
                  </Typography>
                )}

                {safeProject.progress !== undefined && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Progress</Typography>
                      <Typography variant="body2" color="text.secondary">{safeProject.progress}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={safeProject.progress} 
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(safeProject);
                      }}
                      sx={{ 
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.primary.main }
                      }}
                    >
                      <Pencil size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(safeProject.id);
                      }}
                      sx={{ 
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.error.main }
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <PageContainer
      title="Projects"
      description="Manage your projects and track their progress"
      action={
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setIsCreating(true)}
          startIcon={<Plus size={18} />}
        >
          Create Project
        </Button>
      }
    >
      {renderProjectCards()}
      
      {isCreating && renderForm(handleCreateProject, 'Create New Project', 'Create Project')}
      {isEditing && renderForm(handleUpdate, 'Edit Project', 'Update Project')}
    </PageContainer>
  );
}