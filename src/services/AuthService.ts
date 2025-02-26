import { 
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth, googleProvider, currentEnvironment } from '../lib/firebase';
import { initializeUserData } from '../lib/firebase';

export interface AuthError extends Error {
  code?: string;
  environment?: string;
}

export class AuthService {
  private auth: Auth;
  private environment: string;

  constructor(auth: Auth) {
    this.auth = auth;
    this.environment = currentEnvironment;
  }

  async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      await initializeUserData(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      });

      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      await initializeUserData(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      });

      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async signInWithGoogle(): Promise<UserCredential> {
    try {
      // Clear any existing auth state first
      await this.auth.signOut();
      
      // Configure popup settings
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Log which Firebase project we're using
      console.log(`[${this.environment}] Attempting Google sign-in with Firebase project: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`);
      console.log(`[${this.environment}] Auth domain: ${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}`);

      const userCredential = await signInWithPopup(this.auth, provider);

      // Initialize user data after successful sign-in
      await initializeUserData(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      });

      return userCredential;
    } catch (error: any) {
      console.error(`[${this.environment}] Google Sign-In error:`, error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error(`[${this.environment}] Sign-in cancelled. Please try again.`);
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error(`[${this.environment}] Pop-up was blocked. Please allow pop-ups for this site.`);
      }
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error(`[${this.environment}] This domain (${window.location.hostname}) is not authorized for Google Sign-In with project ${import.meta.env.VITE_FIREBASE_PROJECT_ID}. Please ensure it's added to authorized domains in Firebase Console.`);
      }
      if (error.code === 'auth/configuration-not-found') {
        throw new Error(`[${this.environment}] Google Sign-In is not properly configured. Please ensure Google Sign-In is enabled in Firebase Console.`);
      }
      
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return this.auth.onAuthStateChanged(callback);
  }

  private handleAuthError(error: unknown): AuthError {
    const authError = error as AuthError;
    authError.environment = this.environment;
    
    console.error(`[${this.environment}] Authentication error:`, authError);
    
    switch (authError.code) {
      case 'auth/email-already-in-use':
        return new Error(`[${this.environment}] This email is already registered. Please sign in or use a different email.`);
      case 'auth/invalid-email':
        return new Error(`[${this.environment}] Invalid email address. Please check your email and try again.`);
      case 'auth/operation-not-allowed':
        return new Error(`[${this.environment}] This authentication method is not enabled. Please contact support.`);
      case 'auth/weak-password':
        return new Error(`[${this.environment}] Password is too weak. Please use a stronger password.`);
      case 'auth/user-disabled':
        return new Error(`[${this.environment}] This account has been disabled. Please contact support.`);
      case 'auth/user-not-found':
        return new Error(`[${this.environment}] No account found with this email. Please sign up first.`);
      case 'auth/wrong-password':
        return new Error(`[${this.environment}] Incorrect password. Please try again.`);
      case 'auth/popup-closed-by-user':
        return new Error(`[${this.environment}] Sign in cancelled. Please try again.`);
      case 'auth/missing-or-insufficient-permissions':
        return new Error(`[${this.environment}] Missing permissions. Please try again or contact support.`);
      default:
        return new Error(`[${this.environment}] An error occurred during authentication. Please try again.`);
    }
  }
}

// Create singleton instance
let authService: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authService) {
    authService = new AuthService(auth);
  }
  return authService;
}; 