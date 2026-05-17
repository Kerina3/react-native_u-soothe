import HumanPose from "@/components/HumanPose";
import { Pose, PostureType } from "@/types/types";
import { StandingExerciseController, StandingPhase } from "@/utils/standing-pose-detector";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import KegelExerciseProgress, { ExercisePhase } from "./KegelExerciseProgress";

export interface KegelExerciseSessionProps {
  type: PostureType;
  sets: number;
  reps: number;
  restBetweenSets: number;
  onSessionComplete: () => void;
  onSessionCancel: () => void;
}

const KegelExerciseSession: React.FC<KegelExerciseSessionProps> = ({
  type,
  sets,
  reps,
  restBetweenSets,
  onSessionComplete,
  onSessionCancel,
}) => {
  const [phase, setPhase] = useState<StandingPhase>("awaitingStanding");
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  const standingCtrl = useRef<StandingExerciseController | null>(null);

  useEffect(() => {
    if (standingCtrl.current) {
      standingCtrl.current.destroy();
    }

    if (type === PostureType.STANDING) {
      standingCtrl.current = new StandingExerciseController({
        sets,
        reps,
        restBetweenSets,
        holdSeconds: 5,
        repRestSeconds: 2,
        speak: (text) => Speech.speak(text),
        onPhaseChange: (newPhase, rep, set) => {
          setPhase(newPhase);
          setCurrentRep(rep);
          setCurrentSet(set);
        },
        onTick: (sec) => setTimeLeft(sec),
        onComplete: () => setPhase("completed"),
      });
    }
  }, [type, sets, reps, restBetweenSets]);

  useEffect(() => {
    return () => {
      Speech.stop();
      standingCtrl.current?.destroy();
    };
  }, []);

  const handlePauseToggle = () => {
    if (!standingCtrl.current) return;
    if (phase === "paused") {
      standingCtrl.current.resume();
    } else {
      standingCtrl.current.pause();
    }
  };

  const handleCancel = () => {
    standingCtrl.current?.destroy();
    Speech.stop();
    onSessionCancel();
  };

  const handlePoseDetected = (pose: Pose) => {
    if (type === PostureType.STANDING) {
      standingCtrl.current?.onPoseFrame(pose);
    }
  };

  const mapPhaseToProgressPhase = (p: StandingPhase): ExercisePhase => {
    switch (p) {
      case "awaitingStanding": return "setup";
      case "calibrating": return "calibrating";
      case "readyForTiptoe": return "ready";
      case "holding": return "holding";
      // 💡 修正點：正確對應「等待放下」狀態
      case "awaitingBaseline": return "awaitingBaseline";
      case "repResting": return "repResting";
      case "setResting": return "setResting";
      case "paused": return "paused";
      case "completed": return "completed";
      default: return "ready";
    }
  };

  return (
    <View style={styles.container}>
      <HumanPose
        key={`${sets}-${reps}-${restBetweenSets}`}
        enableKeyPoints={true}
        flipHorizontal={false}
        isBackCamera={false}
        color={"255, 255, 255"}
        onPoseDetected={handlePoseDetected}
        enableSkeleton={true}
        scoreThreshold={0.5}
        mode="multiple"
        isFullScreen={true}
      />

      {phase === "awaitingStanding" && (
        <View style={styles.setupOverlay}>
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>請以 45° 半側身站定</Text>
            <Text style={styles.setupDesc}>全身入鏡，系統正在鎖定您的骨架...</Text>
            <Pressable style={styles.cancelTextBtn} onPress={handleCancel}>
              <Text style={styles.cancelTextBtnLabel}>取消返回</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase !== "awaitingStanding" && phase !== "completed" && (
        <View style={styles.hudOverlay} pointerEvents="box-none">
          <KegelExerciseProgress
            type={type}
            sets={sets}
            reps={reps}
            currentSet={currentSet}
            currentRep={currentRep}
            timeRemaining={timeLeft}
            phase={mapPhaseToProgressPhase(phase)}
            onComplete={handleCancel}
            onPause={handlePauseToggle}
            onResume={handlePauseToggle}
            isPaused={phase === "paused"}
          />
        </View>
      )}

      {phase === "completed" && (
        <View style={styles.completedOverlay}>
          <View style={styles.completedModal}>
            <Text style={styles.completedIcon}>🎉</Text>
            <Text style={styles.completedTitle}>恭喜完成！</Text>
            <Text style={styles.completedText}>今天設定的運動目標已達成</Text>
            <Pressable style={styles.completedButton} onPress={onSessionComplete}>
              <Text style={styles.completedButtonText}>返回主畫面</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  hudOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  setupOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "flex-end", paddingBottom: 60, zIndex: 20 },
  setupBox: { backgroundColor: "rgba(20, 20, 25, 0.95)", marginHorizontal: 24, padding: 24, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  setupTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  setupDesc: { color: "#A1A1AA", fontSize: 15, textAlign: "center", marginBottom: 24 },
  cancelTextBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelTextBtnLabel: { color: "#EF4444", fontSize: 16, fontWeight: "600" },
  completedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", zIndex: 100 },
  completedModal: { backgroundColor: "#FFF", borderRadius: 24, padding: 32, alignItems: "center", width: "80%", maxWidth: 340 },
  completedIcon: { fontSize: 64, marginBottom: 16 },
  completedTitle: { fontSize: 24, fontWeight: "bold", color: "#1F2937", marginBottom: 8 },
  completedText: { fontSize: 16, color: "#6B7280", marginBottom: 24, textAlign: "center" },
  completedButton: { backgroundColor: "#10B981", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: "100%", alignItems: "center" },
  completedButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

export default KegelExerciseSession;