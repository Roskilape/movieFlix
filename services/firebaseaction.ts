import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { fetchMovieDetails } from "./api";
import { db } from "./firebase";

export const storeUserProfile = async (
  userProfile: UserProfile,
): Promise<UserProfile & { id: string }> => {
  try {
    const userRef = doc(db, "userProfiles", userProfile.uid);

    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        return {
          ...data,
          // Convert Firestore timestamps back to your profile's Date fields.
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : data.createdAt,
          lastLoginAt:
            data.lastLoginAt instanceof Timestamp
              ? data.lastLoginAt.toDate()
              : data.lastLoginAt,
          id: userDoc.id,
        } as UserProfile & { id: string };
      }

      transaction.set(userRef, userProfile);

      return {
        ...userProfile,
        id: userRef.id,
      };
    });
  } catch (error) {
    console.error("Error storing user profile:", error);
    throw error;
  }
};

export const addToFavourites = async (
  userId: string,
  movieId: string,
): Promise<void> => {
  try {
    const userRef = doc(db, "userProfiles", userId);

    await updateDoc(userRef, {
      favouriteMoviesId: arrayUnion(movieId),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("failed to add movie to favourites", error);
    throw error;
  }
};

export const getAllFavouriteMoviesId = async (
  userId: string,
): Promise<string[]> => {
  const userRef = doc(db, "userProfiles", userId);
  const userSnapshot = await getDoc(userRef);
  const favouriteIds = userSnapshot.data()?.favouriteMoviesId;

  return Array.isArray(favouriteIds) ? favouriteIds : [];
};

export const removeFromFavourites = async (
  userId: string,
  movieId: string,
): Promise<void> => {
  const userRef = doc(db, "userProfiles", userId);

  await updateDoc(userRef, {
    favouriteMoviesId: arrayRemove(movieId),
    updatedAt: new Date(),
  });
};

export const subscribeToFavouriteMovies = (
  userId: string,
  {
    onMovies,
    onLoading,
    onError,
  }: {
    onMovies: (movies: MovieDetails[]) => void;
    onLoading: (loading: boolean) => void;
    onError: (error: Error | null) => void;
  },
): (() => void) => {
  let active = true;
  let requestVersion = 0;
  let previousIds: string | undefined;

  const unsubscribe = onSnapshot(
    doc(db, "userProfiles", userId),
    (snapshot) => {
      const value = snapshot.data()?.favouriteMoviesId;
      const ids: string[] = Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [];
      const idsKey = JSON.stringify(ids);
      // Avoid fetching again when unrelated profile fields change.
      if (idsKey === previousIds) return;
      previousIds = idsKey;
      const version = ++requestVersion;
      onError(null);
      if (ids.length === 0) {
        onMovies([]);
        onLoading(false);
        return;
      }
      onLoading(true);
      void Promise.all(ids.map(fetchMovieDetails))
        .then((details: MovieDetails[]) => {
          if (active && version === requestVersion) onMovies(details);
        })
        .catch((error: unknown) => {
          if (active && version === requestVersion) {
            previousIds = undefined;
            onError(
              error instanceof Error
                ? error
                : new Error("Failed to load saved movies"),
            );
          }
        })
        .finally(() => {
          if (active && version === requestVersion) onLoading(false);
        });
    },
    (error) => {
      ++requestVersion;
      onError(error);
      onLoading(false);
    },
  );

  return () => {
    active = false;
    unsubscribe();
  };
};
