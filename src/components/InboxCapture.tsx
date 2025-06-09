import React, { useState } from 'react';
import { Button } from '@mui/material';
import { TextField, MenuItem, Select, FormControl, InputLabel, Chip, Box, IconButton } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { InboxItemType, InboxItemPriority } from '../types/index';
import { useInbox } from '../hooks/useInbox';

interface InboxCaptureProps {
  onClose?: () => void;
  initialType?: InboxItemType;
  compact?: boolean;
}

export const InboxCapture: React.FC<InboxCaptureProps> = ({ 
  onClose, 
  initialType = InboxItemType.GENERAL,
  compact = false 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<InboxItemType>(initialType);
  const [priority, setPriority] = useState<InboxItemPriority>(InboxItemPriority.MEDIUM);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const { addInboxItem } = useInbox();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await addInboxItem({
        title: title.trim(),
        content: content.trim() || undefined,
        type,
        priority,
        tags: tags.length > 0 ? tags : undefined
      });
      
      setTitle('');
      setContent('');
      setTags([]);
      setNewTag('');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error capturing idea:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newTag.trim()) {
        addTag();
      } else if (title.trim()) {
        handleSubmit(e as React.FormEvent);
      }
    }
  };

  if (compact) {
    return (
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quick capture..."
          size="small"
          variant="outlined"
          sx={{ flexGrow: 1 }}
          onKeyPress={handleKeyPress}
        />
        <Button
          type="submit"
          variant="contained"
          size="small"
          disabled={!title.trim() || loading}
        >
          <AddIcon />
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 500 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <h2>Capture Idea</h2>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          autoFocus
        />

        <TextField
          label="Details (optional)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value as InboxItemType)}
            >
              <MenuItem value={InboxItemType.GENERAL}>General</MenuItem>
              <MenuItem value={InboxItemType.AREA}>Area Idea</MenuItem>
              <MenuItem value={InboxItemType.GOAL}>Goal Idea</MenuItem>
              <MenuItem value={InboxItemType.PROJECT}>Project Idea</MenuItem>
              <MenuItem value={InboxItemType.TASK}>Task Idea</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value as InboxItemPriority)}
            >
              <MenuItem value={InboxItemPriority.LOW}>Low</MenuItem>
              <MenuItem value={InboxItemPriority.MEDIUM}>Medium</MenuItem>
              <MenuItem value={InboxItemPriority.HIGH}>High</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <TextField
              label="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              size="small"
              onKeyPress={handleKeyPress}
            />
            <Button onClick={addTag} size="small" disabled={!newTag.trim()}>
              Add
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                onDelete={() => removeTag(tag)}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {onClose && (
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={!title.trim() || loading}
          >
            {loading ? 'Capturing...' : 'Capture'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};