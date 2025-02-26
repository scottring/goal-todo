import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getEnvironment, getPrefixedCollection } from '../utils/environment';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set persistence to LOCAL to persist the auth state
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Configure Google provider with proper settings for production
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add these parameters to help with popup issues
  access_type: 'offline'
});

// Log environment info for debugging
const env = getEnvironment();
console.log(`Firebase initialized with environment: ${env}`);
console.log(`Using Firebase project: ${firebaseConfig.projectId}`);
console.log(`Auth domain: ${firebaseConfig.authDomain}`);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize user data with environment-specific collection
export async function initializeUserData(
  uid: string,
  userData: { email: string | null; displayName: string | null }
) {
  try {
    const userCollection = getPrefixedCollection('users');
    const userRef = doc(db, userCollection, uid);
    
    // First check if user exists
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document with default data
      await setDoc(userRef, {
        email: userData.email,
        displayName: userData.displayName || 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        environment: getEnvironment(),
        sharedWith: [],
        permissions: {},
        settings: {
          theme: 'light',
          notifications: true
        }
      });
    } else {
      // Update existing user's last login
      await setDoc(userRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
        environment: getEnvironment()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error initializing user data:', error);
    throw error;
  }
}

// Export environment information
export const currentEnvironment = getEnvironment();