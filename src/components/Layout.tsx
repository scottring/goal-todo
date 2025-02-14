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
  Calendar,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAccountButton } from './UserAccountButton';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { text: 'Areas', icon: <Home size={20} />, path: '/areas' },
    { text: 'Goals', icon: <Target size={20} />, path: '/goals' },
    { text: 'Tasks', icon: <CheckSquare size={20} />, path: '/tasks' },
    { text: 'Weekly Planning', icon: <Calendar size={20} />, path: '/weekly-planning' }
  ];

  // Don't show navigation for auth pages
  const isAuthPage = ['/signin', '/signup', '/forgot-password'].includes(location.pathname);
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Redirect to sign in if not authenticated
  if (!currentUser) {
    navigate('/signin', { state: { from: location.pathname } });
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  component={Link}
                  to={item.path}
                  color={isActive(item.path) ? 'primary' : 'inherit'}
                  startIcon={item.icon}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
            <UserAccountButton />
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
