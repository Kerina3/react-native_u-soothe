import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Platform } from "react-native";
import { AuthProvider } from "../context/AuthContext";

// 初始化 Convex 客戶端
const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL || "https://happy-animal-123.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

// Clerk Token 快取機制 (僅用於原生 App，網頁版交給 Clerk 原生機制處理)
let tokenCache: any = undefined;

if (Platform.OS !== "web") {
  tokenCache = {
    async getToken(key: string) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (err) {
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        return;
      }
    },
  };
}

function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="diet"
        options={{
          headerShown: true,
          headerTitle: "排尿預測與飲食紀錄",
          headerTintColor: "#4F46E5",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerBackTitle: "首頁",
        }}
      />
      <Stack.Screen
        name="motion"
        options={{
          headerShown: true,
          headerTitle: "智慧動作偵測",
          headerTintColor: "#4F46E5",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerBackTitle: "首頁",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
