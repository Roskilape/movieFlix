/** Only explicitly authored app errors may expose their message to the form. */
export class AuthFormError extends Error {}

export class EmailVerificationRequiredError extends AuthFormError {
  constructor(public readonly uid: string) {
    super(
      "Please verify your email before signing in. You can resend the verification email below.",
    );
  }
}

export function getAuthErrorMessage(
  error: unknown,
  type: "SignIn" | "SignUp" | "Resend" | "ForgotPassword",
): string {
  if (error instanceof AuthFormError) return error.message;

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;

  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "This email is not registered. Please go to sign up.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Email is required.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Please choose a stronger password that meets the password requirements.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a while and try again.";
    case "auth/network-request-failed":
      return "Unable to connect. Please check your internet connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    default:
      if (type === "ForgotPassword")
        return "Unable to send the password reset email. Please try again.";
      if (type === "Resend")
        return "Unable to resend the verification email. Please try again.";
      return type === "SignIn"
        ? "Sign in failed. Please try again."
        : "Sign up failed. Please try again.";
  }
}
