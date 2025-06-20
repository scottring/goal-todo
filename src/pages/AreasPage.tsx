import React, { useState } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { Target, Home } from 'lucide-react';
import type { Area } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
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
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

export default function AreasPage() {
  const { areas, loading, error, createArea, updateArea, deleteArea } = useAreasContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#000000'
  });
  const navigate = useNavigate();

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsCreating(true);
      await createArea({
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color,
        sharedWith: [],
        permissions: {}
      });
      setFormData({ name: '', description: '', color: '#000000' });
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating area:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (area: Area) => {
    setFormData({
      name: area.name,
      description: area.description || '',
      color: area.color || '#000000'
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
      setFormData({ name: '', description: '', color: '#000000' });
      setIsEditing(false);
      setEditingAreaId(null);
    } catch (err) {
      console.error('Error updating area:', err);
    }
  };

  const handleDelete = async (areaId: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        await deleteArea(areaId);
      } catch (err) {
        console.error('Error deleting area:', err);
      }
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, submitText: string) => (
    <Dialog 
      open={true} 
      onClose={() => {
        setIsCreating(false);
        setIsEditing(false);
        setEditingAreaId(null);
        setFormData({ name: '', description: '', color: '#000000' });
      }}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={onSubmit}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title}
          <IconButton
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#000000' });
            }}
            size="small"
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
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <TextField
                type="color"
                value={formData.color}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                fullWidth
                sx={{ 
                  '& input': { 
                    padding: '8px',
                    height: '40px'
                  } 
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#000000' });
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            {submitText}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Error loading areas: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(45deg, #1f2937, #6b7280)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Areas of Focus
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              Organize your goals and activities into meaningful life areas
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setIsCreating(true)}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              '&:hover': {
                background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
              }
            }}
          >
            Create Area
          </Button>
        </Box>
      </Box>

      {isCreating && renderForm(handleCreateArea, 'Add New Area', 'Create Area')}
      {isEditing && renderForm(handleUpdate, 'Edit Area', 'Update Area')}

      {areas.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderRadius: 4,
          border: '2px dashed',
          borderColor: 'primary.light'
        }}>
          <Target size={64} style={{ color: '#6366f1', marginBottom: '16px' }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Create Your First Area
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Areas help you organize your goals by different aspects of your life - work, health, relationships, and more.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setIsCreating(true)}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5
            }}
          >
            Get Started
          </Button>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {areas.map((area) => (
            <Grid item xs={12} sm={6} lg={4} key={area.id}>
              <Card
                onClick={() => navigate(`/areas/${area.id}`)}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  position: 'relative',
                  overflow: 'visible',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  backdropFilter: 'blur(10px)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: area.color || '#6366f1',
                    borderRadius: '16px 16px 0 0'
                  }
                }}
              >
                <CardContent sx={{ p: 3, pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: area.color || '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}>
                      <Home size={24} color="white" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, opacity: 0.7 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(area);
                        }}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': {
                            bgcolor: 'grey.100',
                            color: 'primary.main'
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(area.id);
                        }}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': {
                            bgcolor: 'error.50',
                            color: 'error.main'
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {area.name}
                  </Typography>
                  
                  {area.description ? (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {area.description}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      No description
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}