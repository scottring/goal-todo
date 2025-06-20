import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  Paper,
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

interface LocationState {
  from?: string;
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, error } = useAuth();
  const from = (location.state as LocationState)?.from || '/';

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 480, 
      mx: 'auto',
      p: 3
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 6,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(45deg, #6366f1, #ec4899)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}
          >
            Welcome back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to continue your goal journey
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-message': {
                fontSize: '0.95rem'
              }
            }}
          >
            {error.message}
          </Alert>
        )}

        <form onSubmit={handleEmailSignIn}>
          <TextField
            label="Email address"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              mb: 3,
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              '&:hover': {
                background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </form>

        <Divider sx={{ my: 3, color: 'text.secondary' }}>or</Divider>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          disabled={loading}
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            border: '2px solid',
            borderColor: 'grey.200',
            '&:hover': {
              borderColor: 'primary.main',
              background: 'primary.50'
            }
          }}
        >
          Continue with Google
        </Button>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <MuiLink
            component={Link}
            to="/forgot-password"
            sx={{ 
              display: 'block', 
              mb: 2,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' }
            }}
          >
            Forgot your password?
          </MuiLink>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <MuiLink 
              component={Link} 
              to="/signup"
              sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                '&:hover': { color: 'primary.dark' }
              }}
            >
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}