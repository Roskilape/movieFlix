declare interface UserDocument {
  id: string;
  email: string;
  name: string;
  givenName: string; // First name
  familyName: string; // Last name
  photo: string | null; // URL to the user's profile photo
}

declare interface UserProfile {
  // Firebase data
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string | null;

  // Google data (enrichment)
  googleId: string;
  givenName: string;
  familyName: string;
  fullName: string;

  // App-specific
  createdAt: Date;
  lastLoginAt: Date;
  favouriteMoviesId: string[];
  updatedAt: Date;
}
