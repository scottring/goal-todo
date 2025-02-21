import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Alert, Button, Card, CardContent, Typography, Box, Container, CircularProgress } from '@mui/material';

export const AcceptInvitePage: React.FC = () => {
  console.log('AcceptInvitePage component rendering');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviterEmail, setInviterEmail] = useState<string | null>(null);
  const userService = getUserService();
  const inviteId = searchParams.get('id');

  useEffect(() => {
    console.log('AcceptInvitePage effect running');
    console.log('Current user:', currentUser);
    console.log('Invite ID:', inviteId);
    
    // If no invite ID, show error
    if (!inviteId) {
      console.log('No invite ID found in URL');
      setError('Invalid invitation link');
      return;
    }

    // If user is not logged in, don't try to fetch the invitation
    if (!currentUser) {
      console.log('User not logged in, showing sign up options');
      return;
    }

    const processInvitation = async () => {
      setLoading(true);
      try {
        console.log('Fetching invitation document...');
        const inviteRef = doc(db, 'pendingHouseholdMembers', inviteId);
        const inviteDoc = await getDoc(inviteRef);

        if (!inviteDoc.exists()) {
          console.log('Invitation document not found');
          setError('This invitation has expired or is no longer valid');
          return;
        }

        const inviteData = inviteDoc.data();
        console.log('Invitation data:', inviteData);
        setInviterEmail(inviteData.invitedByEmail);

        // If user is logged in but with different email
        if (currentUser.email?.toLowerCase() !== inviteData.email.toLowerCase()) {
          console.log('Email mismatch:', currentUser.email, 'vs', inviteData.email);
          setError('This invitation was sent to a different email address. Please sign in with the correct account.');
          return;
        }

        // Accept the invitation
        console.log('Accepting invitation...');
        await userService.acceptHouseholdInvitation(inviteData.invitedByEmail);
        console.log('Invitation accepted successfully');
        navigate('/areas', { 
          state: { 
            message: 'Invitation accepted successfully! You are now connected with your household member.' 
          } 
        });
      } catch (err) {
        console.error('Error processing invitation:', err);
        setError(err instanceof Error ? err.message : 'Failed to process invitation');
      } finally {
        setLoading(false);
      }
    };

    processInvitation();
  }, [currentUser, inviteId]);

  if (!inviteId) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Card sx={{ width: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Invalid Invitation Link
              </Typography>
              <Alert severity="error">
                This invitation link appears to be invalid or incomplete.
              </Alert>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/areas')}
                  fullWidth
                >
                  Go to Home
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  if (!currentUser) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Card sx={{ width: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Welcome to Symphony Goals!
              </Typography>
              <Typography paragraph>
                You've been invited to join a household. To accept the invitation, you'll need to sign in or create an account.
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/signup', { 
                    state: { 
                      redirectAfterAuth: `/accept-invite?id=${inviteId}`
                    } 
                  })}
                  fullWidth
                >
                  Create Account
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/signin', { 
                    state: { 
                      redirectAfterAuth: `/accept-invite?id=${inviteId}`
                    } 
                  })}
                  fullWidth
                >
                  Sign In
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2
        }}>
          <CircularProgress />
          <Typography>Processing invitation...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Card sx={{ width: '100%' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Household Invitation
            </Typography>
            
            {error ? (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/areas')}
                    fullWidth
                  >
                    Go to Areas
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/signin')}
                    fullWidth
                  >
                    Sign In
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography paragraph>
                  {inviterEmail ? `You've been invited by ${inviterEmail} to join their household.` : 'Processing your invitation...'}
                </Typography>
                {!currentUser && (
                  <>
                    <Typography paragraph>
                      Please sign in or create an account to accept the invitation.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => navigate('/signup')}
                        fullWidth
                      >
                        Sign Up
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/signin')}
                        fullWidth
                      >
                        Sign In
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}; 