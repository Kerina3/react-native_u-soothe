import HumanPose from "@/components/HumanPose";
import { Pose, PostureType } from "@/types/types";
import { LyingExerciseController, LyingPhase } from "@/utils/lying-pose-detector"; // 💡 匯入躺姿控制器
import { SittingExerciseController, SittingPhase } from "@/utils/sitting-pose-detector";
import { StandingExerciseController, StandingPhase } from "@/utils/standing-pose-detector";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
// import { Image, Pressable, StyleSheet, Text, View } from "react-native"; // 💡 若取消註解，記得把 Image 加回來
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

// 💡 建立一個聯合型別，包容三種運動的狀態階段
type ActivePhase = StandingPhase | SittingPhase | LyingPhase;

const KegelExerciseSession: React.FC<KegelExerciseSessionProps> = ({
  type,
  sets,
  reps,
  restBetweenSets,
  onSessionComplete,
  onSessionCancel,
}) => {
  // 核心運動狀態
  const [phase, setPhase] = useState<ActivePhase>(
    type === PostureType.SITTING ? "awaitingSitting" :
      type === PostureType.LYING ? "awaitingLying" :
        "awaitingStanding"
  );
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  // === 💡 教學流程狀態 (目前先停用) ===
  // const [showTutorial, setShowTutorial] = useState<boolean | null>(null);
  // const [tutorialStep, setTutorialStep] = useState(1);
  // const [dontShowAgain, setDontShowAgain] = useState(false);

  // 💡 分別準備三個控制器的參考 (Ref)
  const standingCtrl = useRef<StandingExerciseController | null>(null);
  const sittingCtrl = useRef<SittingExerciseController | null>(null);
  const lyingCtrl = useRef<LyingExerciseController | null>(null);

  // === 💡 初始化：檢查是否需要顯示對應的教學 (目前先停用，直接跳過) ===
  /*
  useEffect(() => {
    const checkTutorialState = async () => {
      try {
        let storageKey = "";
        if (type === PostureType.STANDING) storageKey = "TUTORIAL_SKIPPED_STANDING";
        else if (type === PostureType.SITTING) storageKey = "TUTORIAL_SKIPPED_SITTING";
        // else if (type === PostureType.LYING) storageKey = "TUTORIAL_SKIPPED_LYING";

        if (storageKey) {
          const skipped = await AsyncStorage.getItem(storageKey);
          setShowTutorial(skipped !== "true"); 
        } else {
          setShowTutorial(false); 
        }
      } catch (error) {
        setShowTutorial(true); 
      }
    };
    checkTutorialState();
  }, [type]);
  */

  // 綁定控制器：根據選擇的運動類型實例化對應的 Controller
  useEffect(() => {
    // 💡 若未來重新啟用教學，請把這行加回來：if (showTutorial !== false) return; 

    // 每次重新啟動前先銷毀舊的控制器
    standingCtrl.current?.destroy();
    sittingCtrl.current?.destroy();
    lyingCtrl.current?.destroy();

    // 共用的狀態更新邏輯
    const handlePhaseChange = (newPhase: ActivePhase, rep: number, set: number) => {
      setPhase(newPhase);
      setCurrentRep(rep);
      setCurrentSet(set);
    };

    // 💡 判斷要實例化哪一種 Controller
    if (type === PostureType.STANDING) {
      setPhase("awaitingStanding");
      standingCtrl.current = new StandingExerciseController({
        sets, reps, restBetweenSets, holdSeconds: 5, repRestSeconds: 2,
        speak: Speech.speak,
        onPhaseChange: handlePhaseChange,
        onTick: setTimeLeft,
        onComplete: () => setPhase("completed"),
      });
    } else if (type === PostureType.SITTING) {
      setPhase("awaitingSitting");
      sittingCtrl.current = new SittingExerciseController({
        sets, reps, restBetweenSets, holdSeconds: 5, repRestSeconds: 2,
        speak: Speech.speak,
        onPhaseChange: handlePhaseChange,
        onTick: setTimeLeft,
        onComplete: () => setPhase("completed"),
      });
    } else if (type === PostureType.LYING) {
      setPhase("awaitingLying");
      lyingCtrl.current = new LyingExerciseController({
        sets, reps, restBetweenSets, holdSeconds: 5, repRestSeconds: 2,
        speak: Speech.speak,
        onPhaseChange: handlePhaseChange,
        onTick: setTimeLeft,
        onComplete: () => setPhase("completed"),
      });
    }
  }, [type, sets, reps, restBetweenSets]); // 💡 若重新啟用教學，需在 dependency array 加上 showTutorial

  // 離開時銷毀所有資源
  useEffect(() => {
    return () => {
      Speech.stop();
      standingCtrl.current?.destroy();
      sittingCtrl.current?.destroy();
      lyingCtrl.current?.destroy();
    };
  }, []);

  // === 💡 處理教學步驟切換 (目前先停用) ===
  /*
  const handleTutorialNext = async () => {
    if (tutorialStep < 3) {
      setTutorialStep((prev) => prev + 1);
    } else {
      if (dontShowAgain) {
        const storageKey = type === PostureType.SITTING ? "TUTORIAL_SKIPPED_SITTING" : "TUTORIAL_SKIPPED_STANDING";
        await AsyncStorage.setItem(storageKey, "true");
      }
      setShowTutorial(false); 
    }
  };
  */

  const handlePauseToggle = () => {
    if (type === PostureType.STANDING && standingCtrl.current) {
      phase === "paused" ? standingCtrl.current.resume() : standingCtrl.current.pause();
    } else if (type === PostureType.SITTING && sittingCtrl.current) {
      phase === "paused" ? sittingCtrl.current.resume() : sittingCtrl.current.pause();
    } else if (type === PostureType.LYING && lyingCtrl.current) {
      phase === "paused" ? lyingCtrl.current.resume() : lyingCtrl.current.pause();
    }
  };

  const handleCancel = () => {
    standingCtrl.current?.destroy();
    sittingCtrl.current?.destroy();
    lyingCtrl.current?.destroy();
    Speech.stop();
    onSessionCancel();
  };

  const handlePoseDetected = (pose: Pose) => {
    // 💡 若未來重新啟用教學，請把這行判斷加回來：if (showTutorial === false) { ... }
    if (type === PostureType.STANDING) standingCtrl.current?.onPoseFrame(pose);
    else if (type === PostureType.SITTING) sittingCtrl.current?.onPoseFrame(pose);
    else if (type === PostureType.LYING) lyingCtrl.current?.onPoseFrame(pose);
  };

  // 將底層的特定 Phase 轉換為 UI 共用的 ExercisePhase
  const mapPhaseToProgressPhase = (p: ActivePhase): ExercisePhase => {
    switch (p) {
      case "awaitingStanding":
      case "awaitingSitting":
      case "awaitingLying": return "setup";
      case "calibrating": return "calibrating";
      case "readyForTiptoe":
      case "readyForLift": return "ready";
      case "holding": return "holding";
      case "holdInterrupted": return "holdInterrupted";
      case "awaitingBaseline": return "awaitingBaseline";
      case "repResting": return "repResting";
      case "setResting": return "setResting";
      case "paused": return "paused";
      case "completed": return "completed";
      default: return "ready";
    }
  };

  // === 💡 動態取得教學圖片 (目前先停用) ===
  /*
  const getTutorialImage = () => { ... }
  */

  const isAwaiting = phase === "awaitingStanding" || phase === "awaitingSitting" || phase === "awaitingLying";

  // 💡 動態產生等待畫面的標題
  const getSetupTitle = () => {
    if (type === PostureType.SITTING) return "請以側身或 45° 坐在椅上";
    if (type === PostureType.LYING) return "請以側面入鏡平躺，雙膝彎曲踩地";
    return "請以 45° 半側身站定";
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

      {/* 2. 初始化等待畫面 */}
      {/* 💡 若重新啟用教學，請把這行改為：showTutorial === false && isAwaiting && (...) */}
      {isAwaiting && (
        <View style={styles.setupOverlay}>
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>
              {getSetupTitle()}
            </Text>
            <Text style={styles.setupDesc}>全身入鏡，系統正在鎖定您的骨架...</Text>
            <Pressable style={styles.cancelTextBtn} onPress={handleCancel}>
              <Text style={styles.cancelTextBtnLabel}>取消返回</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 3. 運動 HUD 儀表板 */}
      {/* 💡 若重新啟用教學，請把這行改為：showTutorial === false && !isAwaiting && phase !== "completed" && (...) */}
      {!isAwaiting && phase !== "completed" && (
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

      {/* 4. 結算畫面 */}
      {/* 💡 若重新啟用教學，請把這行改為：showTutorial === false && phase === "completed" && (...) */}
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

  // --- 其他原有樣式 ---
  setupOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "flex-end", paddingBottom: 60, zIndex: 20 },
  setupBox: { backgroundColor: "rgba(20, 20, 25, 0.95)", marginHorizontal: 24, padding: 24, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  setupTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
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