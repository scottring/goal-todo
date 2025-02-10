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
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (error || syncError) {
    const errorMessage = error?.message || syncError?.message;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-md max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Authentication Error
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            {errorMessage || 'An error occurred during authentication. Please try again.'}
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-red-600 hover:text-red-500 font-medium"
            >
              Retry
            </button>
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