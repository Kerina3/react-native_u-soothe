import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth as useCustomAuth } from "../context/AuthContext";
import { api } from "../convex/_generated/api";

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const {
    user: customUser,
    userRole,
    login: customLogin,
    logout: customLogout,
  } = useCustomAuth();

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

  // 1. 安全檢查：若 Clerk 未登入，或已登入但仍在載入資料庫個人資料，顯示載入中以避免畫面閃爍
  if (!isLoaded || (isSignedIn && dbUser === undefined)) {
    return (
      <View
        style={[
          styles.safeArea,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/auth" />;
  }

  // 取得身分顯示邏輯 (保留並增強您原本的邏輯)
  const getRoleDisplayName = () => {
    const roleStr = dbUser?.Role || customUser?.Role || userRole;
    if (roleStr === "患者端" || roleStr === "patient") return "患者端";
    if (roleStr === "照護者端" || roleStr === "caregiver") return "照護者端";
    return "已驗證用戶";
  };

  const handleLogout = async () => {
    await signOut(); // Clerk 登出
    customLogout(); // 自定義 Context 清除
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 頂部導覽與個人檔案資訊列 (恢復原貌) */}
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {clerkUser?.imageUrl ? (
                <Image
                  source={{ uri: clerkUser.imageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <MaterialCommunityIcons
                  name={
                    getRoleDisplayName() === "照護者端"
                      ? "heart-plus"
                      : "account"
                  }
                  size={24}
                  color="#4F46E5"
                />
              )}
            </View>
            <View style={styles.textDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {clerkUser?.fullName || customUser?.Name || "使用者"}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {getRoleDisplayName()}
                  </Text>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {clerkUser?.primaryEmailAddress?.emailAddress ||
                    customUser?.Gmail}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>登出</Text>
          </TouchableOpacity>
        </View>

        {/* 英雄標題區 (恢復原貌) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>智慧照護首頁</Text>
          <Text style={styles.heroSubtitle}>
            請選擇下方功能開始進行排尿預測紀錄或即時動作偵測評估。
          </Text>
        </View>

        {/* 功能入口列表 (恢復原貌) */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>主要功能</Text>

          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => router.push("/diet" as any)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: "#E0F2FE" }]}
            >
              <MaterialCommunityIcons
                name="water-outline"
                size={32}
                color="#0284C7"
              />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>排尿預測與飲食紀錄</Text>
              <Text style={styles.featureDescription}>
                記錄飲食與如廁時間，透過 AI 智慧生成最佳如廁時機建議報告。
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => router.push("/motion" as any)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: "#EDE9FE" }]}
            >
              <MaterialCommunityIcons
                name="human-child"
                size={32}
                color="#7C3AED"
              />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>智慧動作偵測</Text>
              <Text style={styles.featureDescription}>
                開啟相機與 MediaPipe 即時辨識人體骨架與姿勢狀態評估。
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  textDetails: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1B4B",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    flexShrink: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  heroCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#E0F2FE",
    textAlign: "center",
    lineHeight: 20,
  },
  featuresSection: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});
