import React from "react";
import { Tabs } from "expo-router";
import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Week" }} />
      <Tabs.Screen name="grocery" options={{ title: "Grocery" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
