import { Image, ImageBackground, View } from "react-native";

import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { icons } from "../../../constants/icons";
import { images } from "../../../constants/images";

interface RouteProps {
  title: string;
  icons: any;
  focused: boolean;
}

const _layout = () => {
  const TabIcon = ({ title, icons, focused }: RouteProps) => {
    return focused ? (
      <View>
        <ImageBackground
          className="flex flex-row w-full flex-1 min-w-[112px] min-h-16 mt-4 justify-center items-center rounded-full overflow-hidden"
          source={images.highlight}
        >
          <Image source={icons} tintColor="#151312" className="size-5" />
          <Text className="text-secondary text-base font-semibold ml-2">
            {title}
          </Text>
        </ImageBackground>
      </View>
    ) : (
      <View className="flex flex-row w-full flex-1 min-w-[112px] min-h-14 mt-4 justify-center items-center ">
        <Image source={icons} tintColor="#A8B5DB" className="size-5" />
        <Text className="text-secondary text-base font-semibold ml-2">
          {title}
        </Text>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarStyle: {
          backgroundColor: "#0f0D23",
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: 36,
          height: 52,
          position: "absolute",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#0F0D23",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon title="Home" icons={icons.home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon title="Search" icons={icons.search} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon title="Saved" icons={icons.save} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon title="Profile" icons={icons.person} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
};

export default _layout;
