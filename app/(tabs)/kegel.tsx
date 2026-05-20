import type { KegelExerciseConfig } from "@/app/(tabs)/KegelExerciseSelector";
import KegelExerciseSelector from "@/app/(tabs)/KegelExerciseSelector";
import KegelExerciseSession from "@/app/(tabs)/KegelExerciseSession";
import { PostureType } from "@/types/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PageState = "home" | "exercise";

export default function KegelPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("home");
  const [showSelector, setShowSelector] = useState(false);
  const [exerciseConfig, setExerciseConfig] =
    useState<KegelExerciseConfig | null>(null);

  const handleStartExercise = (config: KegelExerciseConfig) => {
    setExerciseConfig(config);
    setPageState("exercise");
  };

  const handleSessionComplete = () => {
    setPageState("home");
    setExerciseConfig(null);
  };

  const handleSessionCancel = () => {
    setPageState("home");
    setExerciseConfig(null);
  };

  const handleGoBack = () => {
    router.back();
  };

  const getExerciseTitle = (config: KegelExerciseConfig) => {
    switch (config.type) {
      case PostureType.STANDING:
        return "站姿凱格爾";
      case PostureType.SITTING:
        return "坐姿凱格爾";
      case PostureType.LYING:
        return "躺姿凱格爾";
      default:
        return "凱格爾運動";
    }
  };

  if (pageState === "exercise" && exerciseConfig) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <View style={styles.cameraHeader}>
          <View style={styles.cameraHeaderCard}>
            <View style={styles.cameraHeaderLeft}>
              <Text style={styles.cameraHeaderTitle}>
                {getExerciseTitle(exerciseConfig)}
              </Text>
              <Text style={styles.cameraHeaderSubtitle}>
                {exerciseConfig.sets} 組 × {exerciseConfig.reps} 次，每組休息{" "}
                {exerciseConfig.restBetweenSets} 秒
              </Text>
            </View>
            <Pressable
              style={styles.cameraHeaderButton}
              onPress={handleSessionCancel}
            >
              <Text style={styles.cameraHeaderButtonText}>重新選擇</Text>
            </Pressable>
          </View>
        </View>

        <KegelExerciseSession
          type={exerciseConfig.type}
          sets={exerciseConfig.sets}
          reps={exerciseConfig.reps}
          restBetweenSets={exerciseConfig.restBetweenSets}
          onSessionComplete={handleSessionComplete}
          onSessionCancel={handleSessionCancel}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 頭部 */}
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </Pressable>
          <Text style={styles.headerTitle}>凱格爾運動</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* 主要內容 */}
        <View style={styles.content}>
          {/* 標題區 */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>💪</Text>
            <Text style={styles.heroTitle}>凱格爾運動訓練計劃</Text>
            <Text style={styles.heroDescription}>
              通過科學的運動程序，逐步增強盆底肌肉和核心肌群
            </Text>
          </View>

          {/* 快速開始按鈕 */}
          <Pressable
            style={styles.quickStartButton}
            onPress={() => setShowSelector(true)}
          >
            <Text style={styles.quickStartButtonIcon}>▶</Text>
            <View style={styles.quickStartButtonText}>
              <Text style={styles.quickStartButtonTitle}>開始新的運動</Text>
              <Text style={styles.quickStartButtonDesc}>
                選擇運動類型和強度
              </Text>
            </View>
          </Pressable>

          {/* 推薦計劃 */}
          <View style={styles.recommendedPlans}>
            <Text style={styles.sectionTitle}>推薦計劃</Text>

            {/* 初級計劃 */}
            <Pressable
              style={styles.planCard}
              onPress={() => {
                setExerciseConfig({
                  type: PostureType.SITTING,
                  sets: 2,
                  reps: 10,
                  restBetweenSets: 30,
                });
                setPageState("exercise");
              }}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planIcon}>🪑</Text>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>初級 - 坐姿訓練</Text>
                  <Text style={styles.planDuration}>約 5 分鐘</Text>
                </View>
              </View>
              <Text style={styles.planDetails}>2 組 × 10 次 | 30 秒休息</Text>
              <Text style={styles.planDescription}>適合初學者，低強度運動</Text>
            </Pressable>

            {/* 中級計劃 */}
            <Pressable
              style={styles.planCard}
              onPress={() => {
                setExerciseConfig({
                  type: PostureType.STANDING,
                  sets: 3,
                  reps: 15,
                  restBetweenSets: 45,
                });
                setPageState("exercise");
              }}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planIcon}>🧍</Text>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>中級 - 站姿訓練</Text>
                  <Text style={styles.planDuration}>約 12 分鐘</Text>
                </View>
              </View>
              <Text style={styles.planDetails}>3 組 × 15 次 | 45 秒休息</Text>
              <Text style={styles.planDescription}>增加難度，增強肌肉耐力</Text>
            </Pressable>

            {/* 高級計劃 */}
            <Pressable
              style={styles.planCard}
              onPress={() => {
                setExerciseConfig({
                  type: PostureType.LYING,
                  sets: 4,
                  reps: 20,
                  restBetweenSets: 60,
                });
                setPageState("exercise");
              }}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planIcon}>🛏️</Text>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>高級 - 躺姿訓練</Text>
                  <Text style={styles.planDuration}>約 20 分鐘</Text>
                </View>
              </View>
              <Text style={styles.planDetails}>4 組 × 20 次 | 60 秒休息</Text>
              <Text style={styles.planDescription}>高強度訓練，最大效果</Text>
            </Pressable>
          </View>

          {/* 健康提示 */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>💡 凱格爾運動提示</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipText}>
                每天進行一次或多次訓練，保持規律性
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipText}>
                從較低的強度開始，逐步增加組數和次數
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipText}>
                保持正確的姿勢，緩慢而有控制地進行每個動作
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>4</Text>
              <Text style={styles.tipText}>
                如感到疼痛或不適，應停止運動並諮詢醫生
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 凱格爾選擇器模態 */}
      <KegelExerciseSelector
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        onStartExercise={handleStartExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6DECF",
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: "#8A7A67",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6A543F",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#8A7A67",
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 44,
  },
  cameraHeaderCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(7, 17, 31, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cameraHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  cameraHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  cameraHeaderSubtitle: {
    color: "#B8C2CF",
    fontSize: 12,
  },
  cameraHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  cameraHeaderButtonText: {
    color: "#8EF0C8",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6A543F",
    marginBottom: 8,
    textAlign: "center",
  },
  heroDescription: {
    fontSize: 14,
    color: "#8A7A67",
    textAlign: "center",
    lineHeight: 20,
  },
  quickStartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B68B5A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  quickStartButtonIcon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  quickStartButtonText: {
    flex: 1,
  },
  quickStartButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  quickStartButtonDesc: {
    fontSize: 12,
    color: "#F4EDE1",
  },
  recommendedPlans: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6A543F",
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6DECF",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  planIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6A543F",
    marginBottom: 2,
  },
  planDuration: {
    fontSize: 12,
    color: "#8A7A67",
  },
  planDetails: {
    fontSize: 13,
    color: "#7C9565",
    fontWeight: "600",
    marginBottom: 6,
  },
  planDescription: {
    fontSize: 12,
    color: "#8A7A67",
    lineHeight: 18,
  },
  tipsSection: {
    backgroundColor: "#F2F8F1",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#D7E8D4",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7C9565",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: "#6A543F",
    lineHeight: 18,
  },
});
