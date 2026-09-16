import { Client, Databases, ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);
export const updateSearchCount = async (query: string, movie: Movie) => {
  // check if a record of that search has already been stored

  try {
    const result = await database.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: COLLECTION_ID,
      queries: [Query.equal("searchTerm", query.trim())],
    });

    // if a document is found increment the searchCount field

    if (result.documents.length > 0) {
      const existingMovie = result.documents[0];

      await database.updateDocument({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        documentId: existingMovie.$id,
        data: { count: existingMovie.count + 1 },
      });
    } else {
      // if no doccument is found
      await database.createDocument({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        documentId: ID.unique(),
        data: {
          searchTerm: query.trim(),
          poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          movie_id: movie.id,
          title: movie.title,
          count: 1,
        },
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
  // create a new document in Appwrite database -1
};

export const getTrendingMovies = async (): Promise<
  TrendingMovie[] | undefined
> => {
  try {
    const result = await database.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: COLLECTION_ID,
      queries: [Query.limit(5), Query.orderDesc("count")],
    });

    return result.documents as unknown as TrendingMovie[];
  } catch (error) {
    console.log(error);
    return undefined;
  }
};
