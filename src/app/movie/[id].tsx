import { router, useLocalSearchParams } from "expo-router";
import { BookMarkedIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { icons } from "../../../constants/icons";
import { fetchMovieDetails } from "../../../services/api";

import { useEffect, useState } from "react";
import { useAuth } from "../../../components/AuthProvider";
import {
  addToFavourites,
  getAllFavouriteMoviesId,
  removeFromFavourites,
} from "../../../services/firebaseaction";
import useFetch from "../../../services/useFetch";
import { useUserStore } from "../../store";

interface MovieInfoProps {
  label: string;
  value?: string | number | null;
}

const MovieInfo = ({ label, value }: MovieInfoProps) => (
  <View className="flex-col items-start justify-center mt-5">
    <Text className="text-light-200 font-normal text-sm ">{label}</Text>
    <Text className="text-light-100 font-bold text-sm mt-2">
      {value || "N/A"}
    </Text>
  </View>
);

const MovieDetails = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const [userFavouriteMoviesId, setUserFavouriteMoviesId] = useState<string[]>(
    [],
  );
  const [isAfterEffect, setIsAfterEffect] = useState(false);
  useEffect(() => {
    const fetchUserFavouriteMoviesId = async () => {
      if (!currentUser) {
        setIsAfterEffect(true);
        return;
      }
      const movieIds = await getAllFavouriteMoviesId(currentUser.uid);
      setUserFavouriteMoviesId(movieIds);
      setIsAfterEffect(true);
    };
    fetchUserFavouriteMoviesId();
  }, [currentUser]);

  const { isSignedIn } = useAuth();

  const { id } = useLocalSearchParams();
  const movieId = Array.isArray(id) ? id[0] : id;
  const isMovieSaved = userFavouriteMoviesId.includes(movieId);

  const { data: movie } = useFetch(() => fetchMovieDetails(movieId), true);

  return (
    <View className="bg-primary flex-1">
      {isAfterEffect ? (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
            <View>
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${movie?.poster_path}`,
                }}
                className="w-full h-[550px]"
                resizeMode="stretch"
              />
            </View>
            <View className="flex-col items-start justify-center mt-5 px-5">
              <Text className="text-white font-bold text-xl">
                {movie?.title}
              </Text>
              <View className="flex-row items-center gap-x-1 mt-2">
                <Text className="text-light-200 text-sm">
                  {movie?.release_date?.split("-")[0]}
                </Text>
                <Text className="text-light-200 text-sm">
                  {movie?.runtime}m
                </Text>
              </View>
              <View className="flex-row items-center bg-dark-100 px-2 py-1 rounded-md gap-x-1 mt-2">
                <Image source={icons.star} className="size-4" />
                <Text className="text-white font-bold text-sm">
                  {Math.round(movie?.vote_average)}/10
                </Text>
                <Text className="text-light-200 text-sm">
                  ({movie?.vote_count} votes)
                </Text>
              </View>

              <MovieInfo label="Overview" value={movie?.overview} />
              <MovieInfo
                label="Genres"
                value={
                  movie?.genres?.map((g: any) => g.name).join("-") || "N/A"
                }
              />

              <View className="flex flex-row justify-between w-1/2 gap-x-6">
                <MovieInfo
                  label="Budget"
                  value={`$${movie?.budget / 1_000_000}million`}
                />
                <MovieInfo
                  label="Revenue"
                  value={`$${Math.round(movie?.revenue) / 1_000_000}`}
                />
              </View>
              <MovieInfo
                label="Production Companies"
                value={
                  movie?.production_companies
                    .map((c: any) => c.name)
                    .join("-") || "N/A"
                }
              />
            </View>
          </ScrollView>

          <View className="absolute bottom-5 left-0 right-0 flex gap-y-5">
            <TouchableOpacity
              className={`${isMovieSaved ? "mx-5 bg-orange-500 rounded-lg py-3.5 flex flex-row items-center justify-center z-50" : "mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50"}`}
              onPress={async () => {
                if (!isSignedIn) {
                  router.push("/profile");
                  Alert.alert(
                    "auth needed to save",
                    "Sign in to add movies to Favourite",
                  );
                }
                if (!currentUser) return;
                if (!isMovieSaved) {
                  await addToFavourites(currentUser.uid, movieId);
                  setUserFavouriteMoviesId((ids) =>
                    ids.includes(movieId) ? ids : [...ids, movieId],
                  );
                } else {
                  await removeFromFavourites(currentUser.uid, movieId);
                  setUserFavouriteMoviesId((ids) =>
                    ids.filter((id) => id !== movieId),
                  );
                }
              }}
            >
              <Text className="text-white font-semibold text-base">
                {isMovieSaved
                  ? "Remove movie from Favorites"
                  : " Add to Favorites"}
              </Text>
              <BookMarkedIcon size={20} color="#fff" className="mr-1 mt-0.5" />
            </TouchableOpacity>

            <TouchableOpacity
              className="mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50"
              onPress={router.back}
            >
              <Image
                source={icons.arrow}
                className="size-5 mr-1 mt-0.5 rotate-180"
                tintColor="#fff"
              />
              <Text className="text-white font-semibold text-base">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="small" color="#AB8BFF" />
          <Text className="text-white font-bold text-xs text-center">
            if it takes too long, check your connection.
          </Text>
        </View>
      )}
    </View>
  );
};

export default MovieDetails;
