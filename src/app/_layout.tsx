import "../global.css";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DB_NAME, migrate } from "@/db/schema";
import { importCatalogIfNewer, type CatalogBundle } from "@/db/catalogImport";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import catalogBundle from "../../assets/meals.json";

async function initDb(db: SQLiteDatabase): Promise<void> {
  await migrate(db);
  await importCatalogIfNewer(db, catalogBundle as CatalogBundle);
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const prefsLoaded = usePrefsStore((s) => s.loaded);
  const planLoaded = usePlanStore((s) => s.loaded);
  const loadPrefs = usePrefsStore((s) => s.load);
  const loadPlan = usePlanStore((s) => s.load);

  useEffect(() => {
    void loadPrefs(db);
    void loadPlan(db);
  }, [db, loadPrefs, loadPlan]);

  if (!prefsLoaded || !planLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DB_NAME} onInit={initDb}>
        <BottomSheetModalProvider>
          <Bootstrap>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </Bootstrap>
        </BottomSheetModalProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
