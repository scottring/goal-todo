import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Transform as TransformIcon,
  PriorityHigh as HighPriorityIcon,
  Remove as MediumPriorityIcon,
  ExpandMore as LowPriorityIcon
} from '@mui/icons-material';
import { InboxItem, InboxItemType, InboxItemPriority, InboxItemStatus } from '../types/index';
import { useInbox } from '../hooks/useInbox';
import { formatDistanceToNow } from 'date-fns';

interface InboxListProps {
  items: InboxItem[];
  onConvert?: (item: InboxItem) => void;
}

export const InboxList: React.FC<InboxListProps> = ({ items, onConvert }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<InboxItemType>(InboxItemType.GENERAL);
  const [editPriority, setEditPriority] = useState<InboxItemPriority>(InboxItemPriority.MEDIUM);

  const { updateInboxItem, deleteInboxItem, archiveInboxItem } = useInbox();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: InboxItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditContent(selectedItem.content || '');
      setEditType(selectedItem.type);
      setEditPriority(selectedItem.priority);
      setEditDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleArchive = async () => {
    if (selectedItem) {
      try {
        await archiveInboxItem(selectedItem.id);
      } catch (error) {
        console.error('Error archiving item:', error);
      }
    }
    handleMenuClose();
  };

  const handleConvert = () => {
    if (selectedItem && onConvert) {
      onConvert(selectedItem);
    }
    handleMenuClose();
  };

  const handleEditSave = async () => {
    if (selectedItem) {
      try {
        await updateInboxItem(selectedItem.id, {
          title: editTitle,
          content: editContent || undefined,
          type: editType,
          priority: editPriority
        });
        setEditDialog(false);
      } catch (error) {
        console.error('Error updating item:', error);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedItem) {
      try {
        await deleteInboxItem(selectedItem.id);
        setDeleteDialog(false);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const getPriorityIcon = (priority: InboxItemPriority) => {
    switch (priority) {
      case InboxItemPriority.HIGH:
        return <HighPriorityIcon fontSize="small" color="error" />;
      case InboxItemPriority.MEDIUM:
        return <MediumPriorityIcon fontSize="small" color="warning" />;
      case InboxItemPriority.LOW:
        return <LowPriorityIcon fontSize="small" color="action" />;
    }
  };

  const getTypeColor = (type: InboxItemType) => {
    switch (type) {
      case InboxItemType.AREA:
        return 'primary';
      case InboxItemType.GOAL:
        return 'secondary';
      case InboxItemType.PROJECT:
        return 'success';
      case InboxItemType.TASK:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: InboxItemStatus) => {
    switch (status) {
      case InboxItemStatus.CAPTURED:
        return 'info';
      case InboxItemStatus.PROCESSED:
        return 'success';
      case InboxItemStatus.ARCHIVED:
        return 'default';
    }
  };

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body1">No items in inbox</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => (
          <Card key={item.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getPriorityIcon(item.priority)}
                    <Typography variant="h6" component="h3">
                      {item.title}
                    </Typography>
                  </Box>

                  {item.content && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {item.content}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={item.type}
                      size="small"
                      color={getTypeColor(item.type) as 'primary' | 'secondary' | 'success' | 'warning' | 'default'}
                    />
                    <Chip
                      label={item.status}
                      size="small"
                      color={getStatusColor(item.status) as 'info' | 'success' | 'default'}
                      variant="outlined"
                    />
                    {item.tags?.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, item)}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedItem?.status === InboxItemStatus.CAPTURED && onConvert && (
          <MenuItem onClick={handleConvert}>
            <TransformIcon sx={{ mr: 1 }} />
            Convert
          </MenuItem>
        )}
        {selectedItem?.status === InboxItemStatus.CAPTURED && (
          <MenuItem onClick={handleArchive}>
            <ArchiveIcon sx={{ mr: 1 }} />
            Archive
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Idea</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editType}
                  label="Type"
                  onChange={(e) => setEditType(e.target.value as InboxItemType)}
                >
                  <MenuItem value={InboxItemType.GENERAL}>General</MenuItem>
                  <MenuItem value={InboxItemType.AREA}>Area Idea</MenuItem>
                  <MenuItem value={InboxItemType.GOAL}>Goal Idea</MenuItem>
                  <MenuItem value={InboxItemType.PROJECT}>Project Idea</MenuItem>
                  <MenuItem value={InboxItemType.TASK}>Task Idea</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editPriority}
                  label="Priority"
                  onChange={(e) => setEditPriority(e.target.value as InboxItemPriority)}
                >
                  <MenuItem value={InboxItemPriority.LOW}>Low</MenuItem>
                  <MenuItem value={InboxItemPriority.MEDIUM}>Medium</MenuItem>
                  <MenuItem value={InboxItemPriority.HIGH}>High</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Idea</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedItem?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};