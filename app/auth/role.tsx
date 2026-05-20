import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"patient" | "caregiver" | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    const roleStr = selectedRole === "patient" ? "患者端" : "照護者端";
    login({
      Name: "使用者",
      Gmail: "",
      Role: roleStr,
    });
    // 統一導向首頁，因為首頁將同時提供 diet 與動作偵測兩大功能入口
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>選擇您的身分</Text>
          <Text style={styles.headerSubtitle}>
            請選擇您是患者還是照護者，系統將記錄您的身分以提供適切的健康預測與偵測服務。
          </Text>
        </View>

        <View style={styles.rolesGrid}>
          {/* 患者卡片 */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.roleCard,
              selectedRole === "patient" && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole("patient")}
          >
            <View style={styles.iconWrapPatient}>
              <MaterialCommunityIcons
                name="human-child"
                size={32}
                color="#C2410C"
              />
            </View>
            <Text style={styles.roleTitle}>患者 (Patient)</Text>
            <Text style={styles.roleDescription}>
              專注於自身健康紀錄、動作偵測評估與即時排尿預測提醒。
            </Text>
          </TouchableOpacity>

          {/* 照護者卡片 */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.roleCard,
              selectedRole === "caregiver" && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole("caregiver")}
          >
            <View style={styles.iconWrapCaregiver}>
              <MaterialCommunityIcons
                name="heart-plus-outline"
                size={32}
                color="#1D4ED8"
              />
            </View>
            <Text style={styles.roleTitle}>照護者 (Caregiver)</Text>
            <Text style={styles.roleDescription}>
              協助管理家人健康紀錄、監看動作偵測狀態，並掌握預測排尿時機。
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>確認身分並進入首頁</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 20,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E1B4B",
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
  },
  rolesGrid: {
    flexDirection: "column",
    gap: 16,
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 2,
  },
  roleCardActive: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  iconWrapPatient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconWrapCaregiver: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
