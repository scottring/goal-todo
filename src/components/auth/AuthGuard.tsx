import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SignIn from './SignIn';
import { Loader2, AlertCircle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error, syncError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-md max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Error: {(error || syncError)?.message}
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            Please try refreshing the page. If the error persists, contact support.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <>{children}</>;
}