// Enforce that this module can only be used in server-side code.
// This prevents accidental exposure of server-only Firebase logic to client components.
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

// Import the server cookie API so this module can read the signed-in user's session token.
import { cookies } from "next/headers";
// Import the Firebase app initialization helpers for server-side app creation.
import { initializeServerApp, initializeApp } from "firebase/app";

// Import the Firebase auth instance factory used to get the authenticated user state.
import { getAuth } from "firebase/auth";

// Return an authenticated Firebase client SDK instance for use during server rendering.
// This allows server components to access Firebase with the user's session token.
export async function getAuthenticatedAppForUser() {
  // Read the stored session cookie that contains the signed-in user's ID token.
  const authIdToken = (await cookies()).get("__session")?.value;

  // Create a Firebase server app that uses the user's auth token for authenticated requests.
  // This is a new JS SDK feature that allows server environments to work with Firebase credentials from the client session.
  const firebaseServerApp = initializeServerApp(
    // Initialize the underlying Firebase app instance before attaching the auth token.
    // This is a workaround noted in the Firebase SDK issue linked below.
    initializeApp(),
    {
      // Pass the ID token into the server app so Firebase can authenticate the server-side request.
      authIdToken,
    }
  );

  // Get the auth instance bound to this server app.
  const auth = getAuth(firebaseServerApp);
  // Wait until the auth state has been restored before returning the app and user data.
  await auth.authStateReady();

  // Return the initialized server app and the current user, if one is authenticated.
  return { firebaseServerApp, currentUser: auth.currentUser };
}