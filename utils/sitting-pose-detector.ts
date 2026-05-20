import {
  BodyPartIndex,
  KeyPoint,
  Pose,
  SittingPostureResult,
} from "@/types/types";
import { arePointsVisible, calculateAngle } from "./geometry";

// ─────────────────────────────────────────────────────────────────────────────
// 1. 靜態坐姿檢測與分析模塊 (單幀評估，著重於雙腿伸直與抬起高度)
// ─────────────────────────────────────────────────────────────────────────────

export function detectSittingPosture(pose: Pose): SittingPostureResult {
  const leftHip = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
  const rightHip = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;
  const leftKnee = pose[BodyPartIndex.LEFT_KNEE] as KeyPoint | undefined;
  const rightKnee = pose[BodyPartIndex.RIGHT_KNEE] as KeyPoint | undefined;
  const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;
  const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;
  const leftShoulder = pose[BodyPartIndex.LEFT_SHOULDER] as KeyPoint | undefined;
  const rightShoulder = pose[BodyPartIndex.RIGHT_SHOULDER] as KeyPoint | undefined;

  const result: SittingPostureResult = {
    isSitting: false,
    confidence: 0,
    backAngle: null,
    kneeAngle: null,
    hipAngle: null,
    isProperPosture: false,
    postureFeedback: [],
    scores: { backAngleScore: 0, kneeAngleScore: 0, hipPositionScore: 0, feetPositionScore: 0 },
  };

  // 確保身體關鍵點的可見度 (放寬到 0.4，避免稍微模糊就失敗)
  const essentialPoints = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle, leftShoulder, rightShoulder];
  if (!arePointsVisible(essentialPoints, 0.4)) {
    result.postureFeedback.push("無法檢測到足夠的身體部位，請確保全身(含腳尖)在鏡頭範圍內");
    return result;
  }

  const avgShoulderY = ((leftShoulder?.y || 0) + (rightShoulder?.y || 0)) / 2;
  const avgShoulderX = ((leftShoulder?.x || 0) + (rightShoulder?.x || 0)) / 2;
  const avgHipY = ((leftHip?.y || 0) + (rightHip?.y || 0)) / 2;
  const avgHipX = ((leftHip?.x || 0) + (rightHip?.x || 0)) / 2;

  // 判定是否為坐立狀態：肩膀必須在髖部上方
  const torsoUpright = avgShoulderY < avgHipY;

  // 計算髖部角度 (判斷是站著還是坐著)
  const leftHipAngleRaw = calculateAngle(leftShoulder!, leftHip!, leftKnee!);
  const rightHipAngleRaw = calculateAngle(rightShoulder!, rightHip!, rightKnee!);
  const avgHipAngle = (leftHipAngleRaw + rightHipAngleRaw) / 2;

  // 排除站姿 (站姿髖部角度 > 150) 與過度折疊前傾 (< 60)
  const isSittingRelationship = torsoUpright && avgHipAngle < 150 && avgHipAngle > 60;

  if (!isSittingRelationship) {
    result.postureFeedback.push("未檢測到坐姿，請坐在椅子或床緣上，並保持背部挺直");
    result.isSitting = false;
    return result;
  }

  result.isSitting = true;
  result.confidence = 0.85;

  // ── 評估 1：膝蓋是否伸直 ──
  const leftKneeAngle = calculateAngle(leftHip!, leftKnee!, leftAnkle!);
  const rightKneeAngle = calculateAngle(rightHip!, rightKnee!, rightAnkle!);
  result.kneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // 容許稍微不夠直 (150度以上都不會嚴格扣分)
  const targetKneeAngle = 180;
  const kneeAngleDiff = Math.abs(result.kneeAngle - targetKneeAngle);
  result.scores.kneeAngleScore = Math.max(0, 1 - kneeAngleDiff / 40);

  if (result.kneeAngle < 155) {
    result.postureFeedback.push(`雙腿彎曲得有點多（${result.kneeAngle.toFixed(0)}°），請盡量將雙膝伸直併攏`);
  }

  // ── 評估 2：抬腿高度 (髖部角度) ──
  result.hipAngle = avgHipAngle;
  let liftScore = 0;
  // 目標抬腿高度：80度~125度 (允許腿微微朝下放，不需要完全平行)
  if (result.hipAngle >= 80 && result.hipAngle <= 125) {
    liftScore = 1.0;
  } else if (result.hipAngle > 125 && result.hipAngle < 145) {
    liftScore = 1 - (result.hipAngle - 125) / 20; // 放太低慢慢扣分
  } else if (result.hipAngle < 80) {
    liftScore = 0.6; // 抬太高或身體過度前傾
  }
  result.scores.feetPositionScore = Math.max(0, liftScore);

  if (result.hipAngle > 125) {
    result.postureFeedback.push("腳放得比較低，請嘗試稍微將雙腿再微微往上抬起");
  } else if (result.hipAngle < 80) {
    result.postureFeedback.push("背部可能前傾了，請雙手扶好椅緣，保持背部挺直");
  }

  // ── 評估 3：背部挺直度 ──
  const dx = Math.abs(avgShoulderX - avgHipX);
  const dy = avgHipY - avgShoulderY;
  result.backAngle = Math.atan2(dx, dy) * (180 / Math.PI);
  result.scores.backAngleScore = Math.max(0, 1 - result.backAngle / 30);

  if (result.backAngle > 15) {
    result.postureFeedback.push("身體有些前後傾斜，請收緊核心，保持背部垂直挺直");
  }

  result.scores.hipPositionScore = 0.9;

  // 綜合給分，加重「雙腿伸直」與「抬腿高度」的權重
  const overallScore =
    (result.scores.backAngleScore +
      result.scores.kneeAngleScore * 1.5 +
      result.scores.feetPositionScore * 1.5 +
      result.scores.hipPositionScore) / 5;

  result.isProperPosture = overallScore > 0.7;

  if (result.isProperPosture) {
    result.postureFeedback.push("✓ 動作標準！請保持雙腿伸直微微抬起，並收縮骨盆底肌");
  } else if (overallScore > 0.5) {
    result.postureFeedback.push("⚠ 姿勢尚可，請對照建議微調（特別注意盡量伸直雙腿）");
  } else {
    result.postureFeedback.push("✗ 姿勢需要調整，請確認雙手有支撐且雙腿有伸直離開地面");
  }

  return result;
}

export function getPostureSummary(result: SittingPostureResult): string {
  if (!result.isSitting) return "未檢測到坐姿";
  return result.isProperPosture ? "動作正確 ✓" : "姿勢需要微調 ⚠";
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. 坐姿動態運動控制器模組 (狀態機大腦)
// ─────────────────────────────────────────────────────────────────────────────

export type SittingPhase =
  | "idle"
  | "awaitingSitting"   // 等待使用者坐好
  | "calibrating"       // 鎖定雙腳自然放下的初始基準線
  | "readyForLift"      // 等待雙腿抬起
  | "holding"           // 抬腿發力維持中
  | "holdInterrupted"   // 防作弊：不小心提早放下雙腳
  | "awaitingBaseline"  // 等待雙腿放下休息
  | "repResting"        // 次數間隔休息
  | "setResting"        // 組間休息
  | "paused"
  | "completed";

export interface SittingExerciseOptions {
  sets: number;
  reps: number;
  restBetweenSets: number;
  holdSeconds?: number;
  repRestSeconds?: number;
  speak: (text: string) => void;
  onPhaseChange: (phase: SittingPhase, currentRep: number, currentSet: number) => void;
  onTick: (secondsLeft: number) => void;
  onComplete: () => void;
}

export class SittingExerciseController {
  private phase: SittingPhase = "awaitingSitting";
  private stableFrames = 0;
  private liftFrames = 0;
  private baselineFrames = 0;
  private interruptedFrames = 0; // 💡 新增：用於計算中斷的緩衝幀數 (防抖動)

  // 校準專用變數
  private calibFrames = 0;
  private calibAnkleSum = 0;
  private calibHipSum = 0;

  private currentRep = 1;
  private currentSet = 1;

  private activeTimer: ReturnType<typeof setInterval> | null = null;

  // 基準線：坐姿時，自然垂放的腳踝高度
  private baselineAnkleY: number | null = null;
  private baselineHipY: number | null = null;

  // 峰值：抬腿時，腳踝到達的最高點 (Y值越小越高)
  private peakAnkleY: number = 0;
  private remainingHoldSec = 0;

  private readonly opts: SittingExerciseOptions;
  private readonly HOLD_SEC: number;
  private readonly REP_REST_SEC: number;

  constructor(options: SittingExerciseOptions) {
    this.opts = options;
    this.HOLD_SEC = options.holdSeconds || 5;
    this.REP_REST_SEC = options.repRestSeconds || 2;

    this._setPhase("awaitingSitting");
    // 語音提示：明確引導從頭到腳入鏡，並採用 45度角坐姿
    options.speak(`請確認從頭到腳入鏡，以45度半側身坐在椅子上，共${options.sets}組`);
  }

  // ── 公開 API ──
  onPoseFrame(pose: Pose): void {
    if (this.phase === "paused" || this.phase === "idle" || this.phase === "completed") return;

    switch (this.phase) {
      case "awaitingSitting": this._handleAwaitingSitting(pose); break;
      case "calibrating": this._handleCalibrating(pose); break;
      case "readyForLift": this._handleReadyForLift(pose); break;
      case "holding": this._handleHolding(pose); break;
      case "holdInterrupted": this._handleHoldInterrupted(pose); break;
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
    this.opts.speak("已恢復，請保持坐姿靜止以重新定位");
    this._setPhase("calibrating");
  }

  destroy(): void {
    this._clearTimer();
    this.phase = "idle";
  }

  // ── 內部狀態與計時工具 ──
  private _setPhase(newPhase: SittingPhase): void {
    this.phase = newPhase;
    this.opts.onPhaseChange(newPhase, this.currentRep, this.currentSet);
  }

  private _startHoldTimer(seconds: number): void {
    this.remainingHoldSec = seconds;
    this._clearTimer();
    this.opts.onTick(this.remainingHoldSec);

    this.activeTimer = setInterval(() => {
      this.remainingHoldSec -= 1;
      this.opts.onTick(this.remainingHoldSec);
      if (this.remainingHoldSec <= 0) {
        this._clearTimer();
        this.opts.speak("請放下雙腿");
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

  // 取得高可見度的一側 (45度角避障)
  private _getRobustY(leftPoint?: KeyPoint, rightPoint?: KeyPoint): number | null {
    const lVis = leftPoint?.visibility ?? 0;
    const rVis = rightPoint?.visibility ?? 0;
    if (lVis < 0.3 && rVis < 0.3) return null;
    return lVis > rVis ? leftPoint!.y : rightPoint!.y;
  }

  // 🛡️ 從頭到腳全身入鏡驗證閘門
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

  // ── 運動流程控制 ──

  // 階段 1：等待坐下 (結合 45 度角與頭到腳判定)
  private _handleAwaitingSitting(pose: Pose): void {
    // 必須先通過「從頭到腳入鏡」驗證
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

    // 🛡️ 45 度角嚴格判定 (計算肩寬與軀幹長度的比例)
    const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
    const torsoLength = Math.abs(robustHipY - robustShoulderY);

    if (torsoLength > 0) {
      const angleRatio = shoulderWidth / torsoLength;
      if (angleRatio > 0.7 || angleRatio < 0.15) {
        this.stableFrames = 0; // 若不是 45 度角，拒絕開始
        return;
      }
    }

    // 判斷是否為坐姿 (肩膀在髖部上方，且腳踝在髖部下方)
    if (robustShoulderY < robustHipY && robustAnkleY > robustHipY) {
      this.stableFrames += 1;
      // 穩定坐著約 0.5 秒 (15幀) 才進入校準
      if (this.stableFrames >= 15) {
        this.stableFrames = 0;
        this.opts.speak("姿勢正確，請將雙腳自然放下，保持靜止三秒鐘");
        this._setPhase("calibrating");
      }
    } else {
      this.stableFrames = 0;
    }
  }

  // 階段 2：校準自然垂放的基準線
  private _handleCalibrating(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];

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

    // 收集 20 幀 (約0.6秒) 作為絕對基準線
    if (this.calibFrames >= 20) {
      this.baselineAnkleY = this.calibAnkleSum / 20;
      this.baselineHipY = this.calibHipSum / 20;

      this.calibFrames = 0;
      this.calibAnkleSum = 0;
      this.calibHipSum = 0;

      this.opts.speak(`第 ${this.currentSet} 組，第 ${this.currentRep} 次，請伸直並抬起雙腿`);
      this._setPhase("readyForLift");
    }
  }

  // 階段 3：等待抬腿
  private _handleReadyForLift(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY || !this.baselineHipY) return;

    const legLength = Math.max(Math.abs(this.baselineAnkleY - this.baselineHipY), 0.1);
    const ankleLift = this.baselineAnkleY - robustAnkleY;

    // 抬起門檻：腳踝需抬升超過小腿長度的 15%
    if (ankleLift > legLength * 0.15) {
      this.liftFrames += 1;
      // 連續維持 12 幀 (約 0.4 秒) 確保真的抬穩了，避免太快啟動
      if (this.liftFrames >= 12) {
        this.liftFrames = 0;
        this.interruptedFrames = 0; // 重置防抖緩衝
        this.peakAnkleY = robustAnkleY; // 紀錄抬起來的最高點

        this._setPhase("holding");
        this._startHoldTimer(this.HOLD_SEC);
      }
    } else {
      this.liftFrames = 0;
    }
  }

  // 階段 4：發力維持與 💡 防抖動(Debounce)中斷偵測
  private _handleHolding(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY) return;

    // 持續更新並鎖定雙腳抬高的最高點
    if (robustAnkleY < this.peakAnkleY) {
      this.peakAnkleY = robustAnkleY;
    }

    const legLength = Math.max(Math.abs(this.baselineAnkleY - robustHipY), 0.1);
    // 計算從最高點掉下來多少
    const dropFromPeak = robustAnkleY - this.peakAnkleY;

    // 🚨 防作弊與防抖：將掉落門檻放寬至 15% (允許抖動)，且必須「持續」掉落超過 10 幀 (約 0.3 秒) 才算中斷
    if (dropFromPeak > legLength * 0.15) {
      this.interruptedFrames += 1;
      if (this.interruptedFrames >= 10) {
        this.interruptedFrames = 0;
        this._clearTimer(); // 凍結秒數
        this._setPhase("holdInterrupted");
        this.opts.speak("動作中斷，請重新抬起雙腿");
      }
    } else {
      // 只要腳有抬回去高點範圍內，緩衝幀數就歸零，完美包容肌肉抖動
      this.interruptedFrames = 0;
    }
  }

  // 階段 4.5：動作中斷，等待重新抬起
  private _handleHoldInterrupted(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY) return;

    const legLength = Math.max(Math.abs(this.baselineAnkleY - robustHipY), 0.1);
    const ankleLift = this.baselineAnkleY - robustAnkleY;

    // 重新檢測抬腿，門檻與 readyForLift 相同
    if (ankleLift > legLength * 0.15) {
      this.liftFrames += 1;
      if (this.liftFrames >= 8) {
        this.liftFrames = 0;
        this.interruptedFrames = 0;
        this.peakAnkleY = robustAnkleY; // 刷新最高點紀錄

        this._setPhase("holding");
        this._startHoldTimer(this.remainingHoldSec); // 🚀 從中斷的秒數接續倒數
      }
    } else {
      this.liftFrames = 0;
    }
  }

  // 階段 5：等待雙腿放下休息 (峰值回落法)
  private _handleAwaitingBaseline(pose: Pose): void {
    const leftAnkle = pose[BodyPartIndex.LEFT_ANKLE];
    const rightAnkle = pose[BodyPartIndex.RIGHT_ANKLE];
    const leftHip = pose[BodyPartIndex.LEFT_HIP];
    const rightHip = pose[BodyPartIndex.RIGHT_HIP];

    const robustAnkleY = this._getRobustY(leftAnkle, rightAnkle);
    const robustHipY = this._getRobustY(leftHip, rightHip);

    if (!robustAnkleY || !robustHipY || !this.baselineAnkleY) return;

    const legLength = Math.max(Math.abs(this.baselineAnkleY - robustHipY), 0.1);

    // 計算從最高點降下多少
    const dropFromPeak = robustAnkleY - this.peakAnkleY;
    // 計算與初始垂放的距離
    const liftFromBaseline = this.baselineAnkleY - robustAnkleY;

    // 💡 放下判定：只要從最高點降下超過 20% 腿長 (避開防抖的15%區間)，或已經回到自然垂放點以下，即算放下！
    if (dropFromPeak > legLength * 0.2 || liftFromBaseline <= legLength * 0.05) {
      this.baselineFrames += 1;
      if (this.baselineFrames >= 3) {
        this.baselineFrames = 0;
        this._processNextRep();
      }
    } else {
      this.baselineFrames = 0;
    }
  }

  // 處理進度切換
  private _processNextRep(): void {
    if (this.currentRep < this.opts.reps) {
      this.currentRep += 1;
      this._setPhase("repResting");
      this._startTimer(this.REP_REST_SEC, () => {
        this.opts.speak(`第 ${this.currentRep} 次，請抬起雙腿`);
        this._setPhase("readyForLift");
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