import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { AuthFormError, EmailVerificationRequiredError } from "./authErrors";
import { auth } from "./firebase";
import { buildUserProfile } from "./googleAuth";

/** Sends Firebase's hosted password-reset link without signing the user in. */
export async function forgotPasswordAuth(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    throw new AuthFormError("Email is required.");
  }
  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error) {
    // Keep the same result whether or not account-enumeration protection is enabled.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/user-not-found"
    )
      return;
    throw error;
  }
}

/** Signs in an existing user. Firebase authentication errors propagate to the caller. */
export async function signInWithEmailAndPasswordAuth(
  email: string,
  password: string | undefined,
) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !password) {
    throw new AuthFormError("Email and password are required.");
  }

  const { user } = await signInWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  if (!user.emailVerified) {
    throw new EmailVerificationRequiredError(user.uid);
  }

  return {
    firebaseUser: user,
    userProfile: buildUserProfile(user),
  };
}

/** Creates a new account and sends its verification email. */
export async function signUpWithEmailAndPasswordAuth(
  email: string,
  password: string | undefined,
) {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    throw new AuthFormError("Email and password are required.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  await sendEmailVerification(credential.user);
  return { email: credential.user.email!, uid: credential.user.uid };
}

/** Resends for the unverified account authenticated on the sign-in screen. */
export async function resendVerificationEmail(uid: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new AuthFormError(
      "Please sign in again to resend your verification email.",
    );
  }
  await reload(user);
  if (auth.currentUser?.uid !== uid) {
    throw new AuthFormError(
      "You’re no longer signed in to the account requesting verification. Please sign in to that account again.",
    );
  }
  if (user.emailVerified) {
    await signOut(auth);
    throw new AuthFormError("Your email is already verified. Please sign in.");
  }
  await sendEmailVerification(user);
  return { email: user.email };
}

/** Refreshes verification status and ends the temporary sign-up session. */
export async function completeEmailVerification(uid: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error("Your verification session ended. Please sign in again.");
  }
  await reload(user);
  if (!user.emailVerified) return false;
  if (auth.currentUser?.uid !== uid) return false;
  await signOut(auth);
  return true;
}
