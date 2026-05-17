import {
  BodyPartIndex,
  KeyPoint,
  Pose,
  StandingPostureResult,
} from "@/types/types";
import { arePointsVisible, calculateAngle } from "./geometry";

// ─────────────────────────────────────────────────────────────────────────────
// 1. 靜態站姿檢測模塊
// ─────────────────────────────────────────────────────────────────────────────
export function detectStandingPosture(pose: Pose): StandingPostureResult {
  const MIN_VERTICAL_BODY_RATIO = 0.35;
  const MIN_SHOULDER_TO_HIP_DISTANCE = 0.04;
  const MAX_ALIGNMENT_DEVIATION = 0.085;
  const MAX_SHOULDER_OR_HIP_TILT = 0.045;
  const MAX_KNEE_FLEXION_DEVIATION = 22;
  const MIN_PROPER_POSTURE_SCORE = 0.6;
  const FRONT_FACING_BONUS_WEIGHT = 0.1;

  const leftShoulder = pose[BodyPartIndex.LEFT_SHOULDER] as KeyPoint | undefined;
  const rightShoulder = pose[BodyPartIndex.RIGHT_SHOULDER] as KeyPoint | undefined;
  const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
  const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;
  const leftKnee = pose[BodyPartIndex.LEFT_KNEE] as KeyPoint | undefined;
  const rightKnee = pose[BodyPartIndex.RIGHT_KNEE] as KeyPoint | undefined;
  const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
  const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;

  const result: StandingPostureResult = {
    isStanding: false, confidence: 0, bodyAlignment: null, shoulderAlignment: null,
    kneeFlexion: null, isProperPosture: false, postureFeedback: [],
    scores: { alignmentScore: 0, shoulderScore: 0, kneeScore: 0, bodyHeightScore: 0 },
  };

  const essentialPoints = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
  if (!arePointsVisible(essentialPoints, 0.3)) {
    result.postureFeedback.push("無法檢測到足夠的身體部位，請確保全身在鏡頭範圍內");
    return result;
  }

  const avgShoulderY = ((leftShoulder?.y || 0) + (rightShoulder?.y || 0)) / 2;
  const avgShoulderX = ((leftShoulder?.x || 0) + (rightShoulder?.x || 0)) / 2;
  const avgHipY = ((leftHip?.y || 0) + (rightHip?.y || 0)) / 2;
  const avgHipX = ((leftHip?.x || 0) + (rightHip?.x || 0)) / 2;
  const avgKneeY = ((leftKnee?.y || 0) + (rightKnee?.y || 0)) / 2;
  const avgAnkleY = ((leftAnkle?.y || 0) + (rightAnkle?.y || 0)) / 2;

  const shoulderWidth = Math.abs((leftShoulder?.x || 0) - (rightShoulder?.x || 0));
  const hipWidth = Math.abs((leftHip?.x || 0) - (rightHip?.x || 0));

  const kneesBelowHips = avgKneeY > avgHipY;
  const anklesBelowKnees = avgAnkleY > avgKneeY;
  const bodyVertical = kneesBelowHips && anklesBelowKnees;
  const shoulderToAnkleDistance = Math.abs(avgShoulderY - avgAnkleY);
  const shoulderToHipDistance = Math.abs(avgShoulderY - avgHipY);
  const hipToAnkleDistance = Math.abs(avgHipY - avgAnkleY);

  const isStandingRelationship = bodyVertical && shoulderToHipDistance > MIN_SHOULDER_TO_HIP_DISTANCE && hipToAnkleDistance > shoulderToHipDistance * MIN_VERTICAL_BODY_RATIO;
  if (!isStandingRelationship) {
    result.postureFeedback.push("未檢測到站姿，請站起來或調整相機角度");
    result.isStanding = false;
    return result;
  }
  result.isStanding = true;
  result.confidence = 0.85;

  const shoulderHipAlignment = Math.abs(avgShoulderX - avgHipX);
  const hipAnkleAlignment = Math.abs(avgHipX - ((leftAnkle?.x || 0) + (rightAnkle?.x || 0)) / 2);
  const totalAlignment = (shoulderHipAlignment + hipAnkleAlignment) / 2;
  result.bodyAlignment = totalAlignment * 57.3;
  result.scores.alignmentScore = Math.max(0, 1 - totalAlignment * 5.2);

  if (totalAlignment > MAX_ALIGNMENT_DEVIATION) result.postureFeedback.push("身體有些傾斜，請稍微調整以垂直站立");
  if (leftShoulder && rightShoulder) {
    const shoulderDifference = Math.abs(leftShoulder.y - rightShoulder.y);
    result.shoulderAlignment = shoulderDifference * 57.3;
    result.scores.shoulderScore = Math.max(0, 1 - shoulderDifference * 10);
    if (shoulderDifference > MAX_SHOULDER_OR_HIP_TILT) result.postureFeedback.push("肩膀有些傾斜，請放鬆雙肩並調整成水平");
  }
  if (leftHip && rightHip) {
    const hipDifference = Math.abs(leftHip.y - rightHip.y);
    if (hipDifference > MAX_SHOULDER_OR_HIP_TILT) result.postureFeedback.push("骨盆有些傾斜，請維持髖部水平");
  }

  const torsoReference = Math.max(shoulderToAnkleDistance, 0.001);
  const frontFacingRatio = (shoulderWidth + hipWidth) / 2 / torsoReference;
  const frontFacingScore = Math.max(0, Math.min(1, frontFacingRatio / 0.22));

  if (leftKnee && leftHip && leftAnkle) {
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip || leftHip, rightKnee || leftKnee, rightAnkle || leftAnkle);
    result.kneeFlexion = (leftKneeAngle + rightKneeAngle) / 2;
    const kneeAngleDiff = Math.abs(result.kneeFlexion - 180);
    result.scores.kneeScore = Math.max(0, 1 - kneeAngleDiff / 45);
    if (Math.abs(result.kneeFlexion - 180) > MAX_KNEE_FLEXION_DEVIATION) result.postureFeedback.push(`膝蓋彎曲度不佳（${result.kneeFlexion.toFixed(1)}°），請伸直雙腿`);
  }
  result.scores.bodyHeightScore = shoulderToAnkleDistance > 0.5 ? 0.9 : 0.6;
  const overallScore = (result.scores.alignmentScore + result.scores.shoulderScore + result.scores.kneeScore + result.scores.bodyHeightScore + frontFacingScore * FRONT_FACING_BONUS_WEIGHT) / (4 + FRONT_FACING_BONUS_WEIGHT);
  result.isProperPosture = overallScore >= MIN_PROPER_POSTURE_SCORE;

  if (result.isProperPosture) result.postureFeedback.push("✓ 站姿良好，請保持這個姿勢");
  else if (overallScore > 0.5) result.postureFeedback.push("⚠ 站姿尚可，但需要改進");
  else result.postureFeedback.push("✗ 站姿不佳，請按照建議改正");

  return result;
}

export function getStandingSummary(result: StandingPostureResult): string {
  if (!result.isStanding) return "未檢測到站姿";
  return result.isProperPosture ? "站姿正確 ✓" : "站姿需要改進 ⚠";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 動態運動控制器模組 (加入防作弊/動作中斷機制)
// ─────────────────────────────────────────────────────────────────────────────

export type StandingPhase =
  | "idle"
  | "awaitingStanding"
  | "calibrating"
  | "readyForTiptoe"
  | "holding"
  | "holdInterrupted"   // 💡 新增：動作中斷 (不小心放下腳跟)
  | "awaitingBaseline"
  | "repResting"
  | "setResting"
  | "paused"
  | "completed";

export interface StandingExerciseOptions {
  sets: number;
  reps: number;
  restBetweenSets: number;
  holdSeconds?: number;
  repRestSeconds?: number;
  speak: (text: string) => void;
  onPhaseChange: (phase: StandingPhase, currentRep: number, currentSet: number) => void;
  onTick: (secondsLeft: number) => void;
  onComplete: () => void;
}

export class StandingExerciseController {
  private phase: StandingPhase = "awaitingStanding";
  private stableFrames = 0;
  private tiptoeFrames = 0;
  private baselineFrames = 0;

  private calibFrames = 0;
  private calibAnkleSum = 0;
  private calibHipSum = 0;

  private currentRep = 1;
  private currentSet = 1;

  private activeTimer: ReturnType<typeof setInterval> | null = null;

  private baselineAnkleY: number | null = null;
  private baselineHipY: number | null = null;
  private peakAnkleY: number = 0;

  // 💡 紀錄倒數時剩餘的秒數 (中斷恢復用)
  private remainingHoldSec = 0;

  private readonly opts: StandingExerciseOptions;
  private readonly HOLD_SEC: number;
  private readonly REP_REST_SEC: number;

  constructor(options: StandingExerciseOptions) {
    this.opts = options;
    this.HOLD_SEC = options.holdSeconds || 5;
    this.REP_REST_SEC = options.repRestSeconds || 2;

    this._setPhase("awaitingStanding");
    options.speak(`請確認從頭到腳入鏡，以45度半側身站立，共${options.sets}組`);
  }

  onPoseFrame(pose: Pose): void {
    if (this.phase === "paused" || this.phase === "idle" || this.phase === "completed") return;

    switch (this.phase) {
      case "awaitingStanding": this._handleAwaitingStanding(pose); break;
      case "calibrating": this._handleCalibrating(pose); break;
      case "readyForTiptoe": this._handleReadyForTiptoe(pose); break;
      case "holding": this._handleHolding(pose); break;
      case "holdInterrupted": this._handleHoldInterrupted(pose); break; // 💡 處理動作中斷
      case "awaitingBaseline": this._handleAwaitingBaseline(pose); break;
    }
  }

  pause(): void {
    if (this.phase === "paused" || this.phase === "completed") return;
    this._clearTimer();
    this._setPhase("paused");
    this.opts.speak("已暫停");
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.opts.speak("已恢復，請保持靜止重新定位");
    this._setPhase("calibrating");
  }

  destroy(): void {
    this._clearTimer();
    this.phase = "idle";
  }

  private _setPhase(newPhase: StandingPhase): void {
    this.phase = newPhase;
    this.opts.onPhaseChange(newPhase, this.currentRep, this.currentSet);
  }

  // 💡 獨立的發力倒數計時器，支援中斷接續
  private _startHoldTimer(seconds: number): void {
    this.remainingHoldSec = seconds;
    this._clearTimer();
    this.opts.onTick(this.remainingHoldSec);

    this.activeTimer = setInterval(() => {
      this.remainingHoldSec -= 1;
      this.opts.onTick(this.remainingHoldSec);
      if (this.remainingHoldSec <= 0) {
        this._clearTimer();
        this.opts.speak("請放下腳跟");
        this._setPhase("awaitingBaseline");
      }
    }, 1000);
  }

  private _startTimer(seconds: number, onComplete: () => void): void {
    this._clearTimer();
    let s = seconds;
    this.opts.onTick(s);
    this.activeTimer = setInterval(() => {
      s -= 1;
      this.opts.onTick(s);
      if (s <= 0) {
        this._clearTimer();
        onComplete();
      }
    }, 1000);
  }

  private _clearTimer(): void {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  }

  private _getRobustY(leftPoint?: KeyPoint, rightPoint?: KeyPoint): number | null {
    const lVis = leftPoint?.visibility ?? 0;
    const rVis = rightPoint?.visibility ?? 0;
    if (lVis < 0.3 && rVis < 0.3) return null;
    return lVis > rVis ? leftPoint!.y : rightPoint!.y;
  }

  private _checkFullBodyInFrame(pose: Pose): boolean {
    const nose = pose[0]?.visibility ?? 0;
    const lEar = pose[7]?.visibility ?? 0;
    const rEar = pose[8]?.visibility ?? 0;
    const headVis = Math.max(nose, lEar, rEar);

    const lShoulder = pose[BodyPartIndex.LEFT_SHOULDER]?.visibility ?? 0;
    const rShoulder = pose[BodyPartIndex.RIGHT_SHOULDER]?.visibility ?? 0;
    const lHip = pose[BodyPartIndex.LEFT_HIP]?.visibility ?? 0;
    const rHip = pose[BodyPartIndex.RIGHT_HIP]?.visibility ?? 0;
    const lAnkle = pose[BodyPartIndex.LEFT_ANKLE]?.visibility ?? 0;
    const rAnkle = pose[BodyPartIndex.RIGHT_ANKLE]?.visibility ?? 0;

    const leftValid = headVis > 0.45 && lShoulder > 0.45 && lHip > 0.45 && lAnkle > 0.45;
    const rightValid = headVis > 0.45 && rShoulder > 0.45 && rHip > 0.45 && rAnkle > 0.45;
    return leftValid || rightValid;
  }

  private _handleAwaitingStanding(pose: Pose): void {
    if (!this._checkFullBodyInFrame(pose)) {
      this.stableFrames = 0;
      return;
    }

    const lShoulder = pose[BodyPartIndex.LEFT_SHOULDER];
    const rShoulder = pose[BodyPartIndex.RIGHT_SHOULDER];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];

    if (!lShoulder || !rShoulder) return;

    const robustShoulderY = this._getRobustY(lShoulder, rShoulder);
    const robustHipY = this._getRobustY(leftHip, rightHip);
    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);

    if (!robustShoulderY || !robustHipY || !robustAnkleY) return;

    const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
    const torsoLength = Math.abs(robustHipY - robustShoulderY);

    if (torsoLength > 0) {
      const angleRatio = shoulderWidth / torsoLength;
      if (angleRatio > 0.7 || angleRatio < 0.15) {
        this.stableFrames = 0;
        return;
      }
    }

    if ((robustAnkleY - robustHipY) > 0.15) {
      this.stableFrames += 1;
      if (this.stableFrames >= 15) {
        this.stableFrames = 0;
        this.opts.speak("姿勢正確，請保持");
        this._setPhase("calibrating");
      }
    } else {
      this.stableFrames = 0;
    }
  }

  private _handleCalibrating(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
    const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
    const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this._checkFullBodyInFrame(pose)) {
      this.calibFrames = 0;
      this.calibAnkleSum = 0;
      this.calibHipSum = 0;
      return;
    }

    this.calibAnkleSum += robustAnkleY;
    this.calibHipSum += robustHipY;
    this.calibFrames += 1;

    if (this.calibFrames >= 20) {
      this.baselineAnkleY = this.calibAnkleSum / 20;
      this.baselineHipY = this.calibHipSum / 20;

      this.calibFrames = 0;
      this.calibAnkleSum = 0;
      this.calibHipSum = 0;

      this.opts.speak(`第 ${this.currentSet} 組，第 ${this.currentRep} 次，請墊腳尖`);
      this._setPhase("readyForTiptoe");
    }
  }

  private _handleReadyForTiptoe(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
    const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
    const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY || !this.baselineHipY) return;

    const legLength = Math.max(Math.abs(robustAnkleY - robustHipY), 0.1);
    const ankleLift = this.baselineAnkleY - robustAnkleY;
    const hipLift = this.baselineHipY - robustHipY;

    if (ankleLift > legLength * 0.045 && hipLift > legLength * 0.015) {
      this.tiptoeFrames += 1;
      if (this.tiptoeFrames >= 12) {
        this.tiptoeFrames = 0;
        this.peakAnkleY = robustAnkleY;

        this._setPhase("holding");
        this._startHoldTimer(this.HOLD_SEC); // 使用獨立的發力計時器
      }
    } else {
      this.tiptoeFrames = 0;
    }
  }

  // 💡 創新點：發力監控與中斷防護
  private _handleHolding(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
    const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
    const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY) return;

    // 持續更新最高點紀錄
    if (robustAnkleY < this.peakAnkleY) {
      this.peakAnkleY = robustAnkleY;
    }

    const legLength = Math.max(Math.abs(robustAnkleY - robustHipY), 0.1);
    const dropFromPeak = robustAnkleY - this.peakAnkleY;
    const liftFromBaseline = this.baselineAnkleY - robustAnkleY;

    // 🚨 若不小心掉下來 (從高點掉落大於 3.5% 或快跌回原點)
    if (dropFromPeak > legLength * 0.035 || liftFromBaseline <= legLength * 0.01) {
      this._clearTimer(); // 立刻凍結秒數
      this._setPhase("holdInterrupted");
      this.opts.speak("動作中斷，請重新墊起");
    }
  }

  // 💡 新增：等待重新墊起腳尖繼續計時
  private _handleHoldInterrupted(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
    const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
    const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY || !this.baselineHipY) return;

    const legLength = Math.max(Math.abs(robustAnkleY - robustHipY), 0.1);
    const ankleLift = this.baselineAnkleY - robustAnkleY;
    const hipLift = this.baselineHipY - robustHipY;

    // 重新檢測墊腳，標準與 readyForTiptoe 相同
    if (ankleLift > legLength * 0.045 && hipLift > legLength * 0.015) {
      this.tiptoeFrames += 1;
      if (this.tiptoeFrames >= 8) {
        this.tiptoeFrames = 0;
        this.peakAnkleY = robustAnkleY; // 刷新峰值

        this._setPhase("holding");
        this._startHoldTimer(this.remainingHoldSec); // 🚀 從凍結的秒數繼續倒數
      }
    } else {
      this.tiptoeFrames = 0;
    }
  }

  private _handleAwaitingBaseline(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
    const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
    const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY) return;

    const legLength = Math.max(Math.abs(robustAnkleY - robustHipY), 0.1);
    const dropFromPeak = robustAnkleY - this.peakAnkleY;
    const liftFromBaseline = this.baselineAnkleY - robustAnkleY;

    if (dropFromPeak > legLength * 0.03 || liftFromBaseline <= 0) {
      this.baselineFrames += 1;
      if (this.baselineFrames >= 3) {
        this.baselineFrames = 0;
        this._processNextRep();
      }
    } else {
      this.baselineFrames = 0;
    }
  }

  private _processNextRep(): void {
    if (this.currentRep < this.opts.reps) {
      this.currentRep += 1;
      this._setPhase("repResting");
      this._startTimer(this.REP_REST_SEC, () => {
        this.opts.speak(`第 ${this.currentRep} 次，請墊腳尖`);
        this._setPhase("readyForTiptoe");
      });
    } else {
      if (this.currentSet < this.opts.sets) {
        const nextSet = this.currentSet + 1;
        if (this.opts.restBetweenSets <= 0) {
          this.currentSet = nextSet;
          this.currentRep = 1;
          this.opts.speak(`直接進入第 ${nextSet} 組`);
          this._setPhase("calibrating");
        } else {
          this._setPhase("setResting");
          this.opts.speak(`第 ${this.currentSet} 組完成，休息 ${this.opts.restBetweenSets} 秒`);
          this._startTimer(this.opts.restBetweenSets, () => {
            this.currentSet = nextSet;
            this.currentRep = 1;
            this.opts.speak(`休息完成，第 ${nextSet} 組準備`);
            this._setPhase("calibrating");
          });
        }
      } else {
        this._setPhase("completed");
        this.opts.speak("全部運動完成，做得很好！");
        this.opts.onComplete();
      }
    }
  }
}