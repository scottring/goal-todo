import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Target,
  CheckSquare,
  Calendar,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAccountButton } from './UserAccountButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Separator } from '@/components/ui/separator';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { text: 'Areas', icon: Home, path: '/areas' },
    { text: 'Goals', icon: Target, path: '/goals' },
    { text: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { text: 'Weekly Planning', icon: Calendar, path: '/weekly-planning' }
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <nav className="flex items-center space-x-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.text}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="h-9"
                    asChild
                  >
                    <Link to={item.path} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.text}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <ThemeToggle />
            <Separator orientation="vertical" className="h-6" />
            <UserAccountButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
