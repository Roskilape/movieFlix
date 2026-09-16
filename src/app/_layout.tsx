import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { AuthProvider } from "../../components/AuthProvider";
import "./global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar hidden={true} />

      <Stack screenOptions={{}}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="movie/[id]"
          options={{
            title: "movie-datails",
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="auth"
          options={{
            title: "auth",
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
