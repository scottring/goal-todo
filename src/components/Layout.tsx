import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ListTodo, Target, Layers, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-8">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                  location.pathname === '/' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                Todos
              </Link>
              <Link
                to="/areas"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                  location.pathname === '/areas' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                Areas
              </Link>
              <Link
                to="/goals"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                  location.pathname === '/goals' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Target className="w-4 h-4" />
                Goals
              </Link>
            </div>
            {user && (
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-4">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;