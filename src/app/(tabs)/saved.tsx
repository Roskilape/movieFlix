import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  View,
} from "react-native";
import MovieCard from "../../../components/MovieCard";
import { icons } from "../../../constants/icons";
import { images } from "../../../constants/images";
import { fetchFavouriteMoviesDetails } from "../../../services/firebaseaction";
import useFetch from "../../../services/useFetch";
import { useUserStore } from "../../store";

const Saved = () => {
  const currentUser = useUserStore((state) => state.currentUser);

  const fetchSavedMovies = useCallback(async () => {
    if (!currentUser) return [];
    return (await fetchFavouriteMoviesDetails(currentUser.uid)) ?? [];
  }, [currentUser?.uid]);

  const {
    data: movies,
    loading: moviesLoading,
    error: moviesError,
    refresh,
  } = useFetch(fetchSavedMovies, true);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return (
    <View className="bg-primary flex-1">
      <Image source={images.bg} className="absolute w-full z-0" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5"
        contentContainerStyle={{ minHeight: "100%", paddingBottom: 10 }}
      >
        <Image source={icons.logo} className="w-12 h-10 mx-auto mt-20 mb-5" />

        {moviesLoading ? (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            className="mt-10 self-center"
          />
        ) : moviesError ? (
          <Text> Error: {moviesError?.message}</Text>
        ) : movies ? (
          <View className="flex-1 mt-5">
            <>
              <Text className="text-lg text-white font-bold mt-3">
                Favorite Movies
              </Text>

              <FlatList
                data={movies}
                renderItem={({ item }) => <MovieCard {...item} />}
                keyExtractor={(item) => item.id.toString()}
                numColumns={3}
                columnWrapperStyle={{
                  justifyContent: "flex-start",
                  gap: 20,
                  paddingRight: 5,
                  marginBottom: 10,
                }}
                className="mt-2 pb-32"
                scrollEnabled={false}
              />
            </>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default Saved;
