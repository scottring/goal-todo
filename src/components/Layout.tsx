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
import {
  Home,
  Target,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAccountButton } from './UserAccountButton';
import ChatAssistant from './chat/ChatAssistant';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const menuItems = [
    { text: 'Areas', icon: <Home size={18} />, path: '/areas' },
    { text: 'Goals', icon: <Target size={18} />, path: '/goals' },
    { text: 'Tasks', icon: <CheckSquare size={18} />, path: '/tasks' },
    { text: 'Planning', icon: <Calendar size={18} />, path: '/weekly-planning' }
  ];

  // Don't show navigation for auth pages
  const isAuthPage = ['/signin', '/signup', '/forgot-password'].includes(location.pathname);
  if (isAuthPage) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {children}
      </Box>
    );
  }

  // Redirect to sign in if not authenticated
  if (!currentUser) {
    navigate('/signin', { state: { from: location.pathname } });
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ px: 0, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Typography 
                variant="h6" 
                component={Link}
                to="/areas"
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #6366f1, #ec4899)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textDecoration: 'none',
                  mr: 4
                }}
              >
                GoalFlow
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.text}
                    component={Link}
                    to={item.path}
                    variant={isActive(item.path) ? 'contained' : 'text'}
                    startIcon={item.icon}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      minWidth: 'auto',
                      color: isActive(item.path) ? 'white' : 'text.secondary',
                      bgcolor: isActive(item.path) ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive(item.path) ? 'primary.dark' : 'grey.100',
                      },
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            </Box>
            
            <UserAccountButton />
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, md: 4 } }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
          {children}
        </Container>
      </Box>

      {/* Chat Assistant */}
      {currentUser && !isAuthPage && <ChatAssistant />}
    </Box>
  );
};

export default Layout;
