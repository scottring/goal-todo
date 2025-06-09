import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  useMediaQuery,
  useTheme,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Home,
  Target,
  CheckSquare,
  Calendar,
  FolderKanban,
  Lightbulb,
  Menu as MenuIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAccountButton } from './UserAccountButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { text: 'Inbox', icon: <Lightbulb size={20} />, path: '/inbox' },
    { text: 'Areas', icon: <Home size={20} />, path: '/areas' },
    { text: 'Goals', icon: <Target size={20} />, path: '/goals' },
    { text: 'Projects', icon: <FolderKanban size={20} />, path: '/projects' },
    { text: 'Tasks', icon: <CheckSquare size={20} />, path: '/tasks' },
    { text: 'Weekly Planning', icon: <Calendar size={20} />, path: '/weekly-planning' }
  ];

  // Public routes that don't require authentication
  const isPublicPage = ['/signin', '/signup', '/forgot-password', '/accept-invite'].includes(location.pathname);

  // Return just the children for public pages
  if (isPublicPage) {
    return <Box sx={{ minHeight: '100vh', p: 0 }}>{children}</Box>;
  }

  // Show nothing while checking auth
  if (!currentUser) {
    return null;
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          Symphony
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={Link} 
            to={item.path}
            selected={isActive(item.path)}
            onClick={() => setDrawerOpen(false)}
            sx={{
              borderRadius: 1,
              m: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.contrastText,
                }
              },
              '&:hover': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.contrastText,
                }
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive(item.path) ? theme.palette.primary.contrastText : theme.palette.text.primary,
              minWidth: 40
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: 2 }}>
        <UserAccountButton />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isMobile ? (
              <>
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="menu"
                  onClick={toggleDrawer}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  Symphony
                </Typography>
                <Box sx={{ width: 40 }} /> {/* Spacer for alignment */}
              </>
            ) : (
              <>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mr: 4 }}>
                  Symphony
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                  {menuItems.map((item) => (
                    <Button
                      key={item.text}
                      component={Link}
                      to={item.path}
                      color={isActive(item.path) ? 'primary' : 'inherit'}
                      variant={isActive(item.path) ? 'contained' : 'text'}
                      startIcon={item.icon}
                      sx={{ 
                        borderRadius: '20px',
                        px: 2,
                        py: 1,
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {item.text}
                    </Button>
                  ))}
                </Box>
                <UserAccountButton />
              </>
            )}
          </Container>
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer}
        >
          {drawer}
        </Drawer>
      )}

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 },
          backgroundColor: theme.palette.background.default
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
