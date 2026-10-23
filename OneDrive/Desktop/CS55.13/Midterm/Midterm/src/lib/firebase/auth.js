// Import Firebase auth providers and listeners needed for Google sign-in and auth state tracking.
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as _onAuthStateChanged,
  onIdTokenChanged as _onIdTokenChanged,
} from "firebase/auth";

// Import the shared Firebase auth instance from the client app configuration.
import { auth } from "@/src/lib/firebase/clientApp";

// Expose the Firebase auth state change listener using the app's auth instance.
export function onAuthStateChanged(cb) {
  return _onAuthStateChanged(auth, cb);
}

// Expose the Firebase ID token change listener using the app's auth instance.
export function onIdTokenChanged(cb) {
  return _onIdTokenChanged(auth, cb);
}

// Start the Google sign-in flow with a popup window.
export async function signInWithGoogle() {
  // Create the Google OAuth provider object.
  const provider = new GoogleAuthProvider();

  try {
    // Prompt the user to sign in with their Google account.
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Log any Google sign-in failure for debugging.
    console.error("Error signing in with Google", error);
  }
}

// Sign the current user out of Firebase authentication.
export async function signOut() {
  try {
    // Call the Firebase sign-out method on the shared auth instance.
    return auth.signOut();
  } catch (error) {
    // Log any sign-out error that occurs while terminating the session.
    console.error("Error signing out with Google", error);
  }
}