import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  Tooltip,
  useTheme,
  Button
} from '@mui/material';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';

export const UserAccountButton: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      handleClose();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  // Get initials from name or email
  const getInitials = () => {
    if (currentUser.displayName) {
      return currentUser.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return (currentUser.email || 'U')[0].toUpperCase();
  };

  return (
    <Box>
      <Button
        onClick={handleClick}
        sx={{
          borderRadius: '24px',
          textTransform: 'none',
          pl: 1,
          pr: 2,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          }
        }}
        color="inherit"
        endIcon={<ChevronDown size={16} />}
      >
        {currentUser.photoURL ? (
          <Avatar 
            src={currentUser.photoURL} 
            alt={currentUser.displayName || 'User'}
            sx={{ width: 32, height: 32 }}
          />
        ) : (
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}
          >
            {getInitials()}
          </Avatar>
        )}
        <Typography 
          variant="body2" 
          sx={{ 
            display: { xs: 'none', sm: 'block' },
            fontWeight: 500
          }}
        >
          {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
        </Typography>
      </Button>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 4,
          sx: {
            overflow: 'visible',
            borderRadius: 2,
            mt: 1.5,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            minWidth: 200,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 0.5,
              my: 0.25,
              px: 1.5,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {currentUser.displayName || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {currentUser.email}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <User size={18} />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem 
          onClick={handleSignOut}
          sx={{ 
            color: theme.palette.error.main,
            '& .MuiListItemIcon-root': {
              color: theme.palette.error.main,
            }
          }}
        >
          <ListItemIcon>
            <LogOut size={18} />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}; 