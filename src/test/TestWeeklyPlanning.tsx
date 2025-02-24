import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setupTestData } from './setupTestData';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";

export const TestWeeklyPlanning: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('TestWeeklyPlanning mounted', { currentUser, authLoading });
    if (!authLoading && !currentUser) {
      console.log('Redirecting to signin');
      navigate('/signin');
    }
  }, [currentUser, authLoading, navigate]);

  const handleSetupTest = async () => {
    if (!currentUser) {
      setError('Please sign in to continue');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      console.log('Setting up test data for user:', currentUser.uid);

      await setupTestData(currentUser.uid);
      setSuccess(true);
      console.log('Test data setup complete');

      // Navigate to weekly planning page after a short delay
      setTimeout(() => {
        navigate('/weekly-planning');
      }, 1500);
    } catch (err) {
      console.error('Error setting up test data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    console.log('Auth loading...');
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  console.log('Rendering test content', { currentUser, error, success, loading });

  return (
    <div className="container max-w-md py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Weekly Planning Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                Test data created successfully! Redirecting to weekly planning...
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleSetupTest}
            disabled={loading || !currentUser}
          >
            {loading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Setup Test Data'
            )}
          </Button>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              This will create:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Icons.check className="h-4 w-4 text-primary" />
                <span>A test area</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.check className="h-4 w-4 text-primary" />
                <span>A test goal with 3 unscheduled tasks</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.check className="h-4 w-4 text-primary" />
                <span>2 routines (daily and weekly)</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 