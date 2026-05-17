import { PostureType } from "@/types/types";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export type ExercisePhase =
  | "setup"
  | "calibrating"
  | "ready"
  | "holding"
  | "awaitingBaseline" // 💡 新增：等待放下腳跟
  | "repResting"
  | "setResting"
  | "paused"
  | "completed";

interface KegelExerciseProgressProps {
  type: PostureType;
  sets: number;
  reps: number;
  currentSet: number;
  currentRep: number;
  timeRemaining: number;
  phase?: ExercisePhase;
  isResting?: boolean;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
  containerStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

const KegelExerciseProgress: React.FC<KegelExerciseProgressProps> = ({
  sets,
  reps,
  currentSet,
  currentRep,
  timeRemaining,
  phase = "ready",
  isResting = false,
  onComplete,
  onPause,
  onResume,
  isPaused,
  containerStyle,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const totalReps = sets * reps;
  const currentTotalRep = Math.min((currentSet - 1) * reps + currentRep, totalReps);
  const progressRatio = currentTotalRep / totalReps;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressRatio,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressRatio, animatedProgress]);

  // 動態色彩與文案系統
  const getVisualState = () => {
    if (isPaused || phase === "paused") return { theme: "#F59E0B", label: "已暫停", icon: "⏸" };
    if (phase === "calibrating") return { theme: "#9CA3AF", label: "鎖定基準中", icon: "🔄" };
    if (phase === "holding") return { theme: "#10B981", label: "保持發力", icon: "🔥" };
    if (phase === "repResting" || phase === "setResting" || isResting) return { theme: "#3B82F6", label: "休息恢復", icon: "🌬️" };
    // 💡 修正：放下腳跟的紅粉色警示
    if (phase === "awaitingBaseline") return { theme: "#F43F5E", label: "放下腳跟", icon: "⬇️" };
    if (phase === "completed") return { theme: "#8B5CF6", label: "訓練完成", icon: "🎉" };
    return { theme: "#14B8A6", label: "準備動作", icon: "⚡" };
  };

  const visual = getVisualState();
  const showGiantTimer = phase === "holding" || phase === "repResting" || phase === "setResting" || isResting;

  const widthInterpolation = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={[styles.container, containerStyle]} pointerEvents="box-none">

      {/* 頂部進度條 */}
      <View style={styles.progressTrack} pointerEvents="none">
        <Animated.View
          style={[styles.progressFill, { width: widthInterpolation, backgroundColor: visual.theme }]}
        />
      </View>

      {/* 頂部資訊列 */}
      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeLabel}>組數</Text>
          <Text style={styles.badgeValue}>{currentSet} <Text style={styles.badgeTotal}>/ {sets}</Text></Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: visual.theme }]}>
          <Text style={[styles.statusText, { color: visual.theme }]}>{visual.icon} {visual.label}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeLabel}>次數</Text>
          <Text style={styles.badgeValue}>{currentRep} <Text style={styles.badgeTotal}>/ {reps}</Text></Text>
        </View>
      </View>

      {/* 💡 修改點：操作引導區移至畫面下半部 */}
      <View style={styles.actionArea} pointerEvents="none">
        {showGiantTimer ? (
          // 美化後的發光倒數圓圈
          <View style={[styles.giantCircle, { borderColor: visual.theme, shadowColor: visual.theme }]}>
            <Text style={styles.timerLabel}>{phase === "holding" ? "維持夾緊" : "休息倒數"}</Text>
            <Text style={[styles.timerValue, { color: visual.theme }]}>{timeRemaining}</Text>
          </View>
        ) : (
          // 放下腳跟/準備墊腳的膠囊提示
          <View style={[styles.instructionPill, { backgroundColor: visual.theme }]}>
            <Text style={styles.instructionText}>
              {phase === "calibrating" ? "請保持靜止" :
                phase === "ready" ? "⬆️ 請墊腳尖" :
                  phase === "awaitingBaseline" ? "⬇️ 請放下腳跟" :
                    phase === "paused" ? "暫停中" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* 底部操作按鈕 */}
      <View style={styles.bottomControls}>
        <Pressable style={[styles.btn, styles.btnEnd]} onPress={onComplete}>
          <Text style={styles.btnEndText}>結束訓練</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: isPaused ? "#10B981" : "rgba(0,0,0,0.4)" }]} onPress={isPaused ? onResume : onPause}>
          <Text style={styles.btnText}>{isPaused ? "▶ 繼續" : "⏸ 暫停"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", backgroundColor: "transparent" },

  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", width: "100%", position: "absolute", top: 0 },
  progressFill: { height: "100%" },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 24 },
  badgeContainer: { backgroundColor: "rgba(0, 0, 0, 0.65)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignItems: "center", minWidth: 80, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  badgeLabel: { fontSize: 12, color: "#D1D5DB", fontWeight: "600", marginBottom: 2 },
  badgeValue: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  badgeTotal: { fontSize: 14, color: "#9CA3AF" },
  statusBadge: { backgroundColor: "rgba(0, 0, 0, 0.75)", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5 },
  statusText: { fontSize: 15, fontWeight: "900" },

  // 💡 操作引導區排版：靠下對齊，釋出畫面正中心
  actionArea: {
    flex: 1,
    justifyContent: "flex-end", // 往下推
    alignItems: "center",
    paddingBottom: 40, // 與底部按鈕保持距離
  },

  // 💡 圓圈美化：更細緻的邊框、主題色發光陰影 (Glow effect)
  giantCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)", // 加深一點底色，讓光暈更明顯
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 }, // 置中發光
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  timerLabel: { fontSize: 18, color: "#E5E7EB", fontWeight: "700", marginBottom: 4 },
  timerValue: { fontSize: 96, fontWeight: "900", fontVariant: ["tabular-nums"], textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8, lineHeight: 110 },

  instructionPill: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: 40, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  instructionText: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },

  bottomControls: { flexDirection: "row", paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  btn: { flex: 1, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  btnEnd: { backgroundColor: "rgba(239, 68, 68, 0.75)", borderColor: "rgba(239, 68, 68, 0.5)" },
  btnText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  btnEndText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
});

export default KegelExerciseProgress;