import React, { useState } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { Plus, Pencil, Trash2, Share2, Users } from 'lucide-react';
import type { Area } from '../types';
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
  alpha
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import AreaSharingModal from '../components/AreaSharingModal';
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal';
import { toast } from 'react-hot-toast';
import PageContainer from '../components/PageContainer';

export default function AreasPage() {
  const { areas, loading, error, createArea, updateArea, deleteArea } = useAreasContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCollaboratorsModalOpen, setIsCollaboratorsModalOpen] = useState(false);
  const [sharingArea, setSharingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3a86ff'
  });
  const navigate = useNavigate();
  const theme = useTheme();

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const newArea = {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color,
        sharedWith: [],
        permissions: {},
        permissionInheritance: {
          propagateToGoals: true,
          propagateToMilestones: true,
          propagateToTasks: true,
          propagateToRoutines: true,
        },
      };
      console.log('Creating new area:', newArea);
      await createArea(newArea);
      console.log('Area created successfully');
      setFormData({ name: '', description: '', color: '#3a86ff' });
      setIsCreating(false);
      toast.success('Area created successfully!');
    } catch (err) {
      console.error('Error creating area:', err);
      toast.error('Failed to create area. Please try again.');
    }
  };

  const handleEdit = (area: Area) => {
    setFormData({
      name: area.name,
      description: area.description || '',
      color: area.color || '#3a86ff'
    });
    setEditingAreaId(area.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAreaId) return;

    try {
      await updateArea(editingAreaId, {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color
      });
      setFormData({ name: '', description: '', color: '#3a86ff' });
      setIsEditing(false);
      setEditingAreaId(null);
      toast.success('Area updated successfully!');
    } catch (err) {
      console.error('Error updating area:', err);
      toast.error('Failed to update area. Please try again.');
    }
  };

  const handleDelete = async (areaId: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        await deleteArea(areaId);
        toast.success('Area deleted successfully!');
      } catch (err) {
        console.error('Error deleting area:', err);
        toast.error('Failed to delete area. Please try again.');
      }
    }
  };

  const handleShare = (area: Area) => {
    setSharingArea(area);
    setIsShareModalOpen(true);
  };

  const handleCardClick = (areaId: string, event: React.MouseEvent) => {
    // Only navigate if the click wasn't on a button
    if (!(event.target as HTMLElement).closest('button')) {
      navigate(`/areas/${areaId}`);
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, submitText: string) => (
    <Dialog 
      open={true} 
      onClose={() => {
        setIsCreating(false);
        setIsEditing(false);
        setEditingAreaId(null);
        setFormData({ name: '', description: '', color: '#3a86ff' });
      }}
      maxWidth="sm"
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
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#3a86ff' });
            }}
            size="small"
            sx={{ color: theme.palette.text.secondary }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Name"
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
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#3a86ff' });
            }}
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

  const renderAreaCards = () => {
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
          Error loading areas: {error instanceof Error ? error.message : String(error)}
        </Alert>
      );
    }

    if (!areas || areas.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No areas found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first area to get started
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setIsCreating(true)}
            startIcon={<Plus size={18} />}
          >
            Create Area
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {areas.map(area => (
          <Grid item xs={12} sm={6} md={4} key={area.id}>
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
                  backgroundColor: area.color || theme.palette.primary.main,
                  borderTopLeftRadius: theme.shape.borderRadius,
                  borderTopRightRadius: theme.shape.borderRadius,
                }
              }}
              onClick={(e) => handleCardClick(area.id, e)}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
                    {area.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {area.sharedWith && area.sharedWith.length > 0 && (
                      <Chip 
                        size="small" 
                        label={`${area.sharedWith.length} shared`} 
                        icon={<Users size={14} />} 
                        sx={{ 
                          height: 24,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }} 
                      />
                    )}
                  </Box>
                </Box>
                
                {area.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {area.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(area);
                      }}
                      sx={{ 
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.primary.main }
                      }}
                    >
                      <Pencil size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(area);
                      }}
                      sx={{ 
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.primary.main }
                      }}
                    >
                      <Share2 size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(area.id);
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
        ))}
      </Grid>
    );
  };

  return (
    <PageContainer
      title="Areas of Focus"
      description="Organize your goals and tasks into different areas of your life"
      action={
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setIsCreating(true)}
          startIcon={<Plus size={18} />}
        >
          Create Area
        </Button>
      }
    >
      {renderAreaCards()}
      
      {isCreating && renderForm(handleCreateArea, 'Create New Area', 'Create Area')}
      {isEditing && renderForm(handleUpdate, 'Edit Area', 'Update Area')}
      
      {isShareModalOpen && sharingArea && (
        <AreaSharingModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharingArea(null);
          }}
          areaId={sharingArea.id}
          areaName={sharingArea.name}
        />
      )}
      
      {isCollaboratorsModalOpen && sharingArea && (
        <ManageCollaboratorsModal
          isOpen={isCollaboratorsModalOpen}
          onClose={() => {
            setIsCollaboratorsModalOpen(false);
            setSharingArea(null);
          }}
        />
      )}
    </PageContainer>
  );
}