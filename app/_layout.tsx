import { ClerkProvider, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { ConvexReactClient, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Platform } from "react-native";
import { AuthProvider, useAuth as useCustomAuth } from "../context/AuthContext";
import { api } from "../convex/_generated/api";

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
  const { user: clerkUser } = useUser();
  const { user: customUser, login: customLogin } = useCustomAuth();

  // 根據 Clerk 的 Email 查詢資料庫中的使用者資料
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  const dbUser = useQuery(
    api.users.getUserByEmail,
    userEmail ? { Gmail: userEmail } : "skip",
  );

  // 當從資料庫查到資料後，同步寫入自定義 Context 以進行全域狀態共用
  React.useEffect(() => {
    if (dbUser && !customUser) {
      customLogin(dbUser);
    }
  }, [dbUser, customUser]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
