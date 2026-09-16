import { router } from "expo-router";
import { ChevronRight, Heart } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../../components/AuthProvider";
import { icons } from "../../../constants/icons";
import { images } from "../../../constants/images";
import { signInWithGoogle, signOut } from "../../../services/googleAuth";
import { useUserStore } from "../../store";

const Profile = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const [loading, setLoading] = React.useState(false);
  const {
    user: firebaseUser,
    isSignedIn,
    isInitializing,
    profileError,
  } = useAuth();

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      Alert.alert(
        "Sign In Failed",
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Sign Out Failed",
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  };

  return (
    <View className="bg-primary flex-1">
      <Image source={images.bg} className="absolute w-full z-0" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5"
        contentContainerStyle={{
          minHeight: "100%",
          paddingBottom: 120,
          gap: 100,
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {isInitializing ? (
          <ActivityIndicator className="mt-20 self-center" color="#AB8BFF" />
        ) : !isSignedIn ? (
          <>
            <View className="flex items-center mt-20 self-center gap-y-10 w-full">
              <Text className="text-accent text-2xl">Not Logged in</Text>
              <Image source={images.padlock} className="w-60 h-60" />
              <View className="flex gap-y-6">
                <Text className="text-white font-bold text-center text-4xl">
                  Unlock Your Movie World
                </Text>
                <Text className="text-gray-500 text-center text-lg">
                  Sign In to see Your Saved Movies and Personalize your
                  experience. Explore Everything this App has to offer.
                </Text>
              </View>

              <TouchableOpacity
                className="flex-row border border-gray-400 rounded-full w-11/12 items-center justify-center py-4 gap-x-3"
                onPress={loginWithGoogle}
              >
                <Image source={icons.google} className="w-12 h-10" />
                {loading ? (
                  <ActivityIndicator size="small" color="#0000ff" />
                ) : (
                  <Text className="text-white text-xl">
                    Continue with Google
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="w-11/12 h-20 rounded-full overflow-hidden"
                onPress={() => router.push("/auth/signIn")}
              >
                <ImageBackground
                  source={images.highlight}
                  className="h-full flex items-center justify-center"
                >
                  <Text className="text-dark-200 text-lg font-bold">
                    Sign-in/Sign-up
                  </Text>
                  <Text className=" text-dark-200 text-xs font-bold">
                    with Email and Password
                  </Text>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View className="flex flex-col items-center mt-20 gap-y-1 self-center">
              {profileError && (
                <Text className="text-red-500">{profileError}</Text>
              )}
              <Image
                source={
                  currentUser?.photoURL
                    ? { uri: currentUser.photoURL }
                    : icons.person
                }
                className="w-36 h-36 border-2 border-purple-400 rounded-full"
              />
              <Text className="text-white text-3xl font-bold pt-4 ">
                {currentUser?.displayName ||
                  firebaseUser?.displayName ||
                  "Movie fan"}
              </Text>
              <Text className="text-gray-400 text-xs font-bold ">
                {currentUser?.email || firebaseUser?.email}
              </Text>
              {firebaseUser?.metadata.creationTime && (
                <Text className="text-gray-400 text-xs font-bold ">
                  Member Since: &nbsp;
                  {new Date(
                    firebaseUser.metadata.creationTime,
                  ).toLocaleDateString()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="flex-row justify-between w-full border-b-[0.5px] border-gray-600 py-4"
              onPress={() => router.push("/saved")}
            >
              <View className="flex-row gap-4">
                <Heart color="gray" size={32} />
                <Text className="text-white font-bold text-2xl">
                  Favorite Movies
                </Text>
              </View>
              <ChevronRight color="gray" size={32} />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex items-center mt-40 self-center"
              onPress={logout}
            >
              <Text className="text-red-700 text-lg font-bold">Log Out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default Profile;
