import { useSignIn } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isLoaded) return;

    if (!gmail.trim() || !password.trim()) {
      Alert.alert("提示", "請輸入完整的信箱帳號與密碼");
      return;
    }

    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: gmail.trim(),
        password,
      });

      // 登入成功，啟動 Session
      await setActive({ session: completeSignIn.createdSessionId });

      // 跳轉至首頁
      router.replace("/");
    } catch (error: any) {
      console.error("Login error", error);
      let errorMsg = "請檢查信箱或密碼是否正確";

      // 處理 Clerk 特定的錯誤訊息
      if (error.errors) {
        errorMsg = error.errors[0]?.message || errorMsg;
      }

      Alert.alert("登入失敗", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 頂部裝飾與品牌區塊 */}
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <MaterialCommunityIcons
                name="shield-cross-outline"
                size={48}
                color="#4F46E5"
              />
            </View>
            <Text style={styles.title}>U-Soothe</Text>
            <Text style={styles.subtitle}>雲端智慧排尿與動作評估系統</Text>
          </View>

          {/* 登入表單卡片 */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>帳號登入</Text>

            {/* 信箱輸入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>電子郵件 (Gmail)</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="請輸入您的註冊信箱"
                  value={gmail}
                  onChangeText={setGmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* 密碼輸入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>密碼</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="請輸入密碼"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* 登入按鈕 */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>安全登入</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 底部導向註冊列 */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>還沒有專屬帳戶嗎？</Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              activeOpacity={0.8}
            >
              <Text style={styles.registerLink}>立即註冊</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: "center",
    flexGrow: 1,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E1B4B",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    height: "100%",
  },
  loginButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
});
