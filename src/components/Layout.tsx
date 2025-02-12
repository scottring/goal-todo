import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton
} from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LayersIcon from '@mui/icons-material/Layers';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                to="/"
                color={isActive('/') ? 'primary' : 'inherit'}
                startIcon={<ListAltIcon />}
              >
                Tasks
              </Button>
              <Button
                component={Link}
                to="/areas"
                color={isActive('/areas') ? 'primary' : 'inherit'}
                startIcon={<LayersIcon />}
              >
                Areas
              </Button>
              <Button
                component={Link}
                to="/goals"
                color={isActive('/goals') ? 'primary' : 'inherit'}
                startIcon={<TrackChangesIcon />}
              >
                Goals
              </Button>
              <Button
                component={Link}
                to="/planning"
                color={isActive('/planning') ? 'primary' : 'inherit'}
                startIcon={<EventNoteIcon />}
              >
                Weekly Planning
              </Button>
            </Box>

            {currentUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  {currentUser.displayName || currentUser.email}
                </Typography>
                <IconButton
                  onClick={handleSignOut}
                  color="inherit"
                  size="small"
                >
                  <LogoutIcon />
                </IconButton>
              </Box>
            )}
          </Container>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;