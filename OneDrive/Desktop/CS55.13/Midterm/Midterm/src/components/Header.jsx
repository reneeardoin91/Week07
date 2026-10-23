// Mark this component as a client-side component so it can use browser APIs and Firebase auth state.
"use client";
// Import React and the useEffect hook so the component can react to auth state changes.
import React, { useEffect } from "react";
// Import the Next.js Link component for client-side navigation to the home page.
import Link from "next/link";
// Import the authentication helpers used to sign in, sign out, and listen for token changes.
import {
  signInWithGoogle,
  signOut,
  onIdTokenChanged,
} from "@/src/lib/firebase/auth.js";
// Import the helper that adds sample restaurant and review data to Firestore.
import { addFakeRestaurantsAndReviews } from "@/src/lib/firebase/firestore.js";
// Import the cookie helpers used to store and remove the Firebase session token.
import { setCookie, deleteCookie } from "cookies-next";

// Define a hook that syncs the current user session with a cookie and refreshes the page when the user changes.
function useUserSession(initialUser) {
  // Subscribe to auth token changes whenever the component mounts or the initial user changes.
  useEffect(() => {
    // Return the unsubscribe function from the auth listener.
    return onIdTokenChanged(async (user) => {
      // If a user is logged in, store the Firebase ID token in a cookie for server-side access.
      if (user) {
        const idToken = await user.getIdToken();
        await setCookie("__session", idToken);
      } else {
        // If no user is logged in, remove the session cookie.
        await deleteCookie("__session");
      }
      // If the user did not change, do not reload the page.
      if (initialUser?.uid === user?.uid) {
        return;
      }
      // Refresh the page so the latest auth state is reflected in the UI.
      window.location.reload();
    });
  }, [initialUser]);

  // Return the current user from the initial prop.
  return initialUser;
}

// Export the header component with the current user passed in from the page.
export default function Header({ initialUser }) {
  // Get the user session data from the custom hook.
  const user = useUserSession(initialUser);

  // Define a handler that prevents the default link behavior and signs the user out.
  const handleSignOut = (event) => {
    event.preventDefault();
    signOut();
  };

  // Define a handler that prevents the default link behavior and starts Google sign-in.
  const handleSignIn = (event) => {
    event.preventDefault();
    signInWithGoogle();
  };

  // Return the header layout with a brand link and user actions.
  return (
    <header>
      {/* Render the home page brand link with the Friendly Eats logo. */}
      <Link href="/" className="logo">
        {/* Display the brand logo image. */}
        <img src="/friendly-eats.svg" alt="FriendlyEats" />
        {/* Display the brand text. */}
        Friendly Eats
      </Link>
      {/* If a user is signed in, show the profile menu; otherwise show the sign-in prompt. */}
      {user ? (
        <>
          {/* Render the signed-in user profile area. */}
          <div className="profile">
            <p>
              <img
                className="profileImage"
                src={user.photoURL || "/profile.svg"}
                alt={user.email}
              />
              {user.displayName}
            </p>

            <div className="menu">
              ...
              <ul>
                <li>{user.displayName}</li>

                <li>
                  <a href="#" onClick={addFakeRestaurantsAndReviews}>
                    Add sample restaurants
                  </a>
                </li>

                <li>
                  <a href="#" onClick={handleSignOut}>
                    Sign Out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="profile">
          {/* Render the sign-in action for guests. */}
          <a href="#" onClick={handleSignIn}>
            <img src="/profile.svg" alt="A placeholder user image" />
            Sign In with Google
          </a>
        </div>
      )}
    </header>
  );
}
