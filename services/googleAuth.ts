import {
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "./firebase"; // Import your existing Firebase auth instance
let isGoogleSigninConfigured = false;

/**
 * Load the native module only when the user starts a Google auth action.
 * Expo Router can preload tab modules, and eagerly importing GoogleSignin here
 * crashes the whole tab navigator when the app is opened in Expo Go or in an
 * out-of-date development build that does not contain the native module.
 */

export function buildUserProfile(
  firebaseUser: FirebaseUser,
  googleUser?: {
    id?: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    photo?: string | null;
  } | null,
): UserProfile {
  return {
    // Firebase
    uid: firebaseUser.uid,
    email: firebaseUser.email || googleUser?.email || "",
    emailVerified: firebaseUser.emailVerified || false,
    displayName: firebaseUser.displayName || googleUser?.name || "",
    photoURL: firebaseUser.photoURL || googleUser?.photo || null,

    // Google enrichment
    googleId: googleUser?.id || firebaseUser.providerData.find((provider) => provider.providerId === "google.com")?.uid || "",
    givenName: googleUser?.givenName || "",
    familyName: googleUser?.familyName || "",
    fullName: googleUser?.name || firebaseUser.displayName || "",

    // App-specific
    createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
    lastLoginAt: new Date(firebaseUser.metadata.lastSignInTime || Date.now()),
    favouriteMoviesId: [],
    updatedAt: new Date(),
  };
}
async function getGoogleSignin() {
  try {
    const { GoogleSignin } =
      await import("@react-native-google-signin/google-signin");

    if (!isGoogleSigninConfigured) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
      });
      isGoogleSigninConfigured = true;
    }

    return GoogleSignin;
  } catch (error) {
    throw new Error(
      "Google Sign-In is not available in this app build. Install a new development build instead of opening the project in Expo Go.",
      { cause: error },
    );
  }
}

/**
 * Sign in with Google and authenticate with Firebase
 * @returns {Promise<{user: import("firebase/auth").User, googleUserInfo: any}>}
 */
export async function signInWithGoogle() {
  try {
    const googleSignin = await getGoogleSignin();

    // Check if Google Play Services are available (Android only)
    await googleSignin.hasPlayServices();

    // Get the user's ID token
    const response = await googleSignin.signIn();

    // Get the ID token
    const idToken =
      (response as any).idToken ?? (response as any).data?.idToken;

    const googleUser =
      (response as any).user ?? (response as any).data?.user ?? null;

    if (!idToken) {
      throw new Error("No ID token found");
    }

    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(
      auth,
      googleCredential,
    );

    const userProfile = buildUserProfile(userCredential.user, googleUser);

    return {
      firebaseUser: userCredential.user,
      userProfile,
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

/**
 * Sign out from both Google and Firebase
 */
export async function signOut() {
  const usesGoogle = auth.currentUser?.providerData.some(
    (provider) => provider.providerId === "google.com",
  );
  // End Firebase's session even when the Google native module is unavailable.
  await auth.signOut();
  if (!usesGoogle) return;
  try {
    const GoogleSignin = await getGoogleSignin();
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
}

/**
 * Check if user is currently signed in with Google
 */
export async function isSignedIn() {
  await auth.authStateReady();
  return !!auth.currentUser?.emailVerified;
}

/**
 * Get the current Google user info without re-authenticating
 */
export async function getCurrentGoogleUser() {
  try {
    const GoogleSignin = await getGoogleSignin();
    const userInfo = await GoogleSignin.getCurrentUser();
    return userInfo;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}
