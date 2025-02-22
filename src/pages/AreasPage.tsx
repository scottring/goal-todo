import React, { useState } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import AreaSharingModal from '../components/AreaSharingModal';
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal';

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
    color: '#000000'
  });
  const navigate = useNavigate();

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsCreating(true);
      const newArea = {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color,
        sharedWith: [],
        permissions: {},
      };
      console.log('Creating new area:', newArea);
      await createArea(newArea);
      console.log('Area created successfully');
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

  const handleShare = (area: Area) => {
    setSharingArea(area);
    setIsShareModalOpen(true);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Areas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Organize your tasks and activities into different areas of focus
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Manage Collaborators">
              <Button
                variant="outlined"
                startIcon={<GroupIcon />}
                onClick={() => setIsCollaboratorsModalOpen(true)}
              >
                Collaborators
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreating(true)}
            >
              Add Area
            </Button>
          </Box>
        </Box>
      </Box>

      {isCreating && renderForm(handleCreateArea, 'Add New Area', 'Create Area')}
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
      {isCollaboratorsModalOpen && (
        <ManageCollaboratorsModal
          isOpen={isCollaboratorsModalOpen}
          onClose={() => setIsCollaboratorsModalOpen(false)}
        />
      )}

      <Grid container spacing={3}>
        {areas.map((area) => (
          <Grid item xs={12} sm={6} lg={4} key={area.id}>
            <Card
              onClick={() => navigate(`/areas/${area.id}`)}
              sx={{
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: 3
                },
                borderLeft: `4px solid ${area.color || '#000000'}`
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {area.name}
                    </Typography>
                    {area.description && (
                      <Typography variant="body2" color="text.secondary">
                        {area.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(area);
                      }}
                      sx={{ color: 'primary.main' }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(area);
                      }}
                      sx={{ color: 'action.active' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(area.id);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}