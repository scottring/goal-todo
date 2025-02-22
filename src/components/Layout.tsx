import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container
} from '@mui/material';
import {
  Home,
  Target,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAccountButton } from './UserAccountButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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

  // Public routes that don't require authentication
  const isPublicPage = ['/signin', '/signup', '/forgot-password', '/accept-invite'].includes(location.pathname);

  console.log('Layout rendering:', {
    pathname: location.pathname,
    search: location.search,
    isPublicPage,
    currentUser: !!currentUser
  });

  useEffect(() => {
    if (!isPublicPage && !currentUser) {
      console.log('No user found, redirecting to signin');
      navigate('/signin', { state: { from: location.pathname } });
    } else if (currentUser && location.pathname === '/') {
      console.log('User authenticated, redirecting to areas');
      navigate('/areas');
    }
  }, [currentUser, isPublicPage, location.pathname, navigate]);

  // Return just the children for public pages
  if (isPublicPage) {
    return <Box sx={{ minHeight: '100vh', p: 0 }}>{children}</Box>;
  }

  // Show loading or nothing while checking auth
  if (!currentUser) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
