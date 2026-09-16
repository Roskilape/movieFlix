import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { TMDB_CONFIG } from "./api";
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

// export const addToFavourites = async (
//   userId: string,
//   movieId: string,
// ): Promise<void> => {
//   try {
//     const userRef = doc(db, "userProfiles", userId);

//     return await runTransaction(db, async (transaction) => {
//       const userDoc = await transaction.get(userRef);
//       let updatedUserProfile: UserProfile;

//       if (userDoc.exists()) {
//         const userData = userDoc.data() as UserProfile;
//         const favoriteMovie = Array.isArray(userData.favouriteMoviesId)
//           ? userData.favouriteMoviesId
//           : [];

//         updatedUserProfile = {
//           ...userData,
//           favouriteMoviesId: [...favoriteMovie, movieId],
//           updatedAt: new Date(),
//         };
//         transaction.update(userRef, updatedUserProfile);
//       }
//     });
//   } catch (error) {
//     console.error("failed to add movie to favourites", error);
//   }
// };

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

export const fetchFavouriteMoviesDetails = async (
  userId: string,
): Promise<MovieDetails[]> => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      return [];
    }
    const userData = userSnapshot.data() as UserProfile;

    const favouriteMoviesId = Array.isArray(userData.favouriteMoviesId)
      ? userData.favouriteMoviesId
      : [];

    if (favouriteMoviesId.length > 0) {
      return await Promise.all(
        favouriteMoviesId.map(async (movieId) => {
          const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`,
            {
              method: "GET",
              headers: TMDB_CONFIG.headers,
            },
          );
          if (!response.ok) throw new Error("failed to fetch movie details");

          const data = (await response.json()) as MovieDetails;
          return data;
        }),
      );
    } else {
      return [];
    }
  } catch (error) {
    console.log("failed to fetch favourite movie details", error);
    throw error;
  }
};
