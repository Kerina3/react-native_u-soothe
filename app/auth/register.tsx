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
import { useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth as useCustomAuth } from "../../context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const storeUser = useMutation(api.users.storeUser);
  const { login: customLogin } = useCustomAuth();

  // 表單欄位狀態
  const [name, setName] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("男");
  const [role, setRole] = useState("患者端");
  const [loading, setLoading] = useState(false);

  // 驗證碼流程狀態
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  // 第一步：建立 Clerk 帳號
  const handleRegister = async () => {
    if (!isLoaded) return;

    if (!name.trim() || !gmail.trim() || !password.trim() || !age.trim()) {
      Alert.alert("提示", "請填寫完整註冊欄位資料");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: gmail.trim(),
        password,
        firstName: name.trim(),
      });

      await signUp.prepareVerification({ strategy: "email_code" });
      setPendingVerification(true);
      Alert.alert("驗證郵件已發送", "請檢查您的信箱並輸入 6 位數驗證碼");
    } catch (error: any) {
      console.error("Register error", error);
      Alert.alert("註冊失敗", error.errors?.[0]?.message || "請檢查欄位格式");
    } finally {
      setLoading(false);
    }
  };

  // 第二步：驗證驗證碼並同步資料至 Convex
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    if (!code.trim()) {
      Alert.alert("提示", "請輸入驗證碼");
      return;
    }

    setLoading(true);
    console.log("開始驗證驗證碼:", code);

    try {
      // 1. 嘗試 Clerk 驗證
      const completeSignUp = await signUp.attemptVerification({ 
        strategy: "email_code",
        code 
      });

      if (completeSignUp.status !== "complete") {
        console.log("Clerk 驗證狀態未完成:", completeSignUp.status);
        throw new Error(`驗證未完成，狀態：${completeSignUp.status}`);
      }

      console.log("Clerk 驗證成功，啟動 Session...");

      // 2. 啟動 Session
      await setActive({ session: completeSignUp.createdSessionId });

      console.log("Session 啟動成功，開始同步資料至 Convex...");

      // 3. 同步身分資料到 Convex (加上 5 秒超時預防卡死)
      await Promise.race([
        storeUser({
          Name: name.trim(),
          Gmail: gmail.trim(),
          Age: age.trim(),
          Gender: gender,
          Role: role,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("CONVEX_SYNC_TIMEOUT")), 5000)
        ),
      ]);

      console.log("Convex 同步成功，登入自定義 Context...");

      // 4. 自定義登入狀態快取
      customLogin({
        Name: name.trim(),
        Gmail: gmail.trim(),
        Role: role,
        Age: age.trim(),
        Gender: gender,
      });

      router.replace("/");
    } catch (error: any) {
      console.error("Verification detail error:", error);
      
      let errorMsg = "未知錯誤";
      
      try {
        if (error.errors && error.errors.length > 0) {
          errorMsg = error.errors[0].message || error.errors[0].longMessage;
        } else if (error.message) {
          errorMsg = error.message;
        } else {
          errorMsg = JSON.stringify(error);
        }
      } catch (e) {
        errorMsg = "解析錯誤訊息失敗";
      }

      if (errorMsg === "CONVEX_SYNC_TIMEOUT") {
        errorMsg = "帳號已建立，但資料同步至後端逾時。請嘗試重新登入。";
      }

      Alert.alert("驗證/同步失敗", errorMsg);
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
          {/* 頂部標題列 */}
          <View style={styles.headerCard}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={36}
              color="#4F46E5"
            />
            <Text style={styles.headerTitle}>建立新帳戶</Text>
            <Text style={styles.headerSubtitle}>
              填妥基本資料與身分設定，享受智慧化照護與健康預測服務。
            </Text>
          </View>

          {/* 表單區塊 */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>帳戶基本資料</Text>

            {/* 姓名 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>真實姓名</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入您的姓名"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 信箱 (Gmail) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>電子郵件 (Gmail)</Text>
              <TextInput
                style={styles.input}
                placeholder="example@gmail.com"
                value={gmail}
                onChangeText={setGmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 密碼 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>設定密碼</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入至少6位數密碼"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 年齡 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>年齡</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入年齡數字"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 性別選擇 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>性別</Text>
              <View style={styles.optionsRow}>
                {["男", "女", "其他"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      gender === option && styles.optionButtonActive,
                    ]}
                    onPress={() => setGender(option)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        gender === option && styles.optionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 身分角色選擇 */}
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>身分設定</Text>
            <View style={styles.rolesContainer}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  role === "患者端" && styles.roleCardActive,
                ]}
                onPress={() => setRole("患者端")}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="human-child"
                  size={28}
                  color={role === "患者端" ? "#C2410C" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.roleTitle,
                    role === "患者端" && styles.roleTitleActive,
                  ]}
                >
                  患者端
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  role === "照護者端" && styles.roleCardActive,
                ]}
                onPress={() => setRole("照護者端")}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="heart-plus-outline"
                  size={28}
                  color={role === "照護者端" ? "#1D4ED8" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.roleTitle,
                    role === "照護者端" && styles.roleTitleActive,
                  ]}
                >
                  照護者端
                </Text>
              </TouchableOpacity>
            </View>

            {/* 送出或驗證按鈕 */}
            {!pendingVerification ? (
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>建立帳號並發送驗證碼</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.verificationSection}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: "#4F46E5" }]}>輸入郵件驗證碼</Text>
                  <TextInput
                    style={[styles.input, { borderColor: "#4F46E5", borderWidth: 2 }]}
                    placeholder="6 位數驗證碼"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={onVerifyPress}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>確認驗證並完成註冊</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setPendingVerification(false)}
                  style={{ marginTop: 10, alignItems: "center" }}
                >
                  <Text style={{ color: "#6B7280", fontSize: 13 }}>重新填寫註冊資料</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 返回登入連結 */}
            <TouchableOpacity
              style={styles.backContainer}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>已有帳戶？返回登入</Text>
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
    paddingTop: 32,
    paddingBottom: 40,
    gap: 20,
  },
  headerCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E1B4B",
    marginTop: 10,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: "#0F172A",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    height: 44,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  optionButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  optionTextActive: {
    color: "#4F46E5",
  },
  rolesContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  roleCardActive: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  roleTitleActive: {
    color: "#B45309",
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  verificationSection: {
    marginTop: 10,
    gap: 10,
  },
});
