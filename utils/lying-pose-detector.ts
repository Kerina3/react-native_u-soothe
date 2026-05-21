import {
  BodyPartIndex,
  KeyPoint,
  LyingPostureResult,
  Pose,
} from "@/types/types";
import { calculateAngle } from "./geometry";

// ─────────────────────────────────────────────────────────────────────────────
// 工具函數：自動抓取畫面中最清晰的一側（解決側躺時的肢體遮擋問題）
// ─────────────────────────────────────────────────────────────────────────────
function getBestSideAngles(pose: Pose) {
  const ls = pose[BodyPartIndex.LEFT_SHOULDER] as KeyPoint | undefined;
  const lh = pose[BodyPartIndex.LEFT_HIP] as KeyPoint | undefined;
  const lk = pose[BodyPartIndex.LEFT_KNEE] as KeyPoint | undefined;
  const la = pose[BodyPartIndex.LEFT_ANKLE] as KeyPoint | undefined;

  const rs = pose[BodyPartIndex.RIGHT_SHOULDER] as KeyPoint | undefined;
  const rh = pose[BodyPartIndex.RIGHT_HIP] as KeyPoint | undefined;
  const rk = pose[BodyPartIndex.RIGHT_KNEE] as KeyPoint | undefined;
  const ra = pose[BodyPartIndex.RIGHT_ANKLE] as KeyPoint | undefined;

  const leftVis = (ls?.visibility || 0) + (lh?.visibility || 0) + (lk?.visibility || 0) + (la?.visibility || 0);
  const rightVis = (rs?.visibility || 0) + (rh?.visibility || 0) + (rk?.visibility || 0) + (ra?.visibility || 0);

  const isLeft = leftVis > rightVis;
  const shoulder = isLeft ? ls : rs;
  const hip = isLeft ? lh : rh;
  const knee = isLeft ? lk : rk;
  const ankle = isLeft ? la : ra;

  if (!shoulder || !hip || !knee || !ankle) return null;

  return {
    hipAngle: calculateAngle(shoulder, hip, knee), // 肩-髖-膝 夾角
    kneeAngle: calculateAngle(hip, knee, ankle),   // 髖-膝-踝 夾角
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 靜態躺姿檢測與分析模塊 (純角度判定法)
// ─────────────────────────────────────────────────────────────────────────────

export function detectLyingPosture(pose: Pose): LyingPostureResult {
  const result: LyingPostureResult = {
    isLying: false,
    confidence: 0,
    bodyAngle: null,
    spineAlignment: null,
    neckAngle: null,
    isProperPosture: false,
    postureFeedback: [],
    scores: { alignmentScore: 0, spineScore: 0, neckScore: 0, supportScore: 0 },
  };

  const angles = getBestSideAngles(pose);

  if (!angles) {
    result.postureFeedback.push("無法檢測到足夠的身體部位，請確保全身(側面)在鏡頭內");
    return result;
  }

  const { hipAngle, kneeAngle } = angles;

  // 平躺屈膝時的基礎角度容錯範圍
  const isHipResting = hipAngle > 110 && hipAngle < 175;
  const isKneeBent = kneeAngle > 35 && kneeAngle < 120;

  if (!isHipResting || !isKneeBent) {
    result.postureFeedback.push("未檢測到準備姿勢，請平躺並將雙膝彎曲踩地");
    result.isLying = false;
    return result;
  }

  result.isLying = true;
  result.confidence = 0.85;

  result.scores.supportScore = Math.max(0, 1 - Math.abs(kneeAngle - 75) / 60);
  result.isProperPosture = result.scores.supportScore > 0.5;

  if (result.isProperPosture) {
    result.postureFeedback.push("✓ 準備姿勢標準！請準備收縮臀部並向上抬起");
  } else {
    result.postureFeedback.push("⚠ 姿勢需要微調，請確認雙腳踩穩");
  }

  return result;
}

export function getLyingSummary(result: LyingPostureResult): string {
  if (!result.isLying) return "未檢測到躺姿";
  return result.isProperPosture ? "動作正確 ✓" : "姿勢需要微調 ⚠";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 躺姿動態運動控制器模組 (狀態機大腦)
// ─────────────────────────────────────────────────────────────────────────────

export type LyingPhase =
  | "idle"
  | "awaitingLying"
  | "calibrating"
  | "readyForLift"
  | "holding"
  | "holdInterrupted"
  | "awaitingBaseline"
  | "repResting"
  | "setResting"
  | "paused"
  | "completed";

export interface LyingExerciseOptions {
  sets: number;
  reps: number;
  restBetweenSets: number;
  holdSeconds?: number;
  repRestSeconds?: number;
  speak: (text: string) => void;
  onPhaseChange: (phase: LyingPhase, currentRep: number, currentSet: number) => void;
  onTick: (secondsLeft: number) => void;
  onComplete: () => void;
}

export class LyingExerciseController {
  private phase: LyingPhase = "awaitingLying";
  private stableFrames = 0;
  private liftFrames = 0;
  private baselineFrames = 0;
  private interruptedFrames = 0;

  private calibFrames = 0;
  private calibHipAngleSum = 0;

  private currentRep = 1;
  private currentSet = 1;

  private activeTimer: ReturnType<typeof setInterval> | null = null;

  private baselineHipAngle: number | null = null;
  private peakHipAngle: number = 0;
  private remainingHoldSec = 0;

  private lastSpeakTime: number = 0;

  private readonly opts: LyingExerciseOptions;
  private readonly HOLD_SEC: number;
  private readonly REP_REST_SEC: number;

  constructor(options: LyingExerciseOptions) {
    this.opts = options;
    this.HOLD_SEC = options.holdSeconds || 5;
    this.REP_REST_SEC = options.repRestSeconds || 2;

    this._setPhase("awaitingLying");
    options.speak(`請以側面入鏡平躺，雙膝彎曲踩地，共${options.sets}組`);
  }

  onPoseFrame(pose: Pose): void {
    if (this.phase === "paused" || this.phase === "idle" || this.phase === "completed") return;

    switch (this.phase) {
      case "awaitingLying": this._handleAwaitingLying(pose); break;
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
    this.opts.speak("已恢復，請保持平躺靜止以重新定位");
    this._setPhase("calibrating");
  }

  destroy(): void {
    this._clearTimer();
    this.phase = "idle";
  }

  private _setPhase(newPhase: LyingPhase): void {
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
        this.opts.speak("請放下臀部");
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

  private _speakWithThrottle(text: string, cooldownMs: number = 5000): void {
    const now = Date.now();
    if (now - this.lastSpeakTime >= cooldownMs) {
      this.opts.speak(text);
      this.lastSpeakTime = now;
    }
  }

  // ── 運動流程控制 ──

  private _handleAwaitingLying(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles) {
      this.stableFrames = 0;
      return;
    }

    const { hipAngle, kneeAngle } = angles;

    if (hipAngle > 110 && hipAngle < 175 && kneeAngle > 35 && kneeAngle < 120) {
      this.stableFrames += 1;
      if (this.stableFrames >= 15) {
        this.stableFrames = 0;
        this.opts.speak("姿勢正確，請保持靜止三秒鐘");
        this._setPhase("calibrating");
      }
    } else {
      this.stableFrames = 0;
    }
  }

  private _handleCalibrating(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles) {
      this.calibFrames = 0;
      this.calibHipAngleSum = 0;
      return;
    }

    this.calibHipAngleSum += angles.hipAngle;
    this.calibFrames += 1;

    if (this.calibFrames >= 20) {
      this.baselineHipAngle = this.calibHipAngleSum / 20;

      this.calibFrames = 0;
      this.calibHipAngleSum = 0;

      this.opts.speak(`第 ${this.currentSet} 組，第 ${this.currentRep} 次，請收縮並抬起臀部`);
      this._setPhase("readyForLift");
    }
  }

  private _handleReadyForLift(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles || !this.baselineHipAngle) return;

    // 💡 抬起判定：比初始躺平角度增加 8° 以上
    if (angles.hipAngle > this.baselineHipAngle + 8) {
      this.liftFrames += 1;
      if (this.liftFrames >= 10) {
        this.liftFrames = 0;
        this.interruptedFrames = 0;
        this.peakHipAngle = angles.hipAngle;

        this._setPhase("holding");
        this._startHoldTimer(this.HOLD_SEC);
      }
    } else {
      this.liftFrames = 0;
    }
  }

  private _handleHolding(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles || !this.baselineHipAngle) return;

    if (angles.hipAngle > this.peakHipAngle) {
      this.peakHipAngle = angles.hipAngle;
    }

    const dropFromPeak = this.peakHipAngle - angles.hipAngle;

    // 💡 雙重放下判定 (只要中一個就算掉下來)：
    // 1. 觸底判定：掉回接近躺平基準線 (+4度以內)
    // 2. 斷崖掉落：從最高點瞬間掉落超過 15度
    if (angles.hipAngle < this.baselineHipAngle + 4 || dropFromPeak > 15) {
      this.interruptedFrames += 1;
      if (this.interruptedFrames >= 10) { // 允許 0.3秒的極短暫失誤
        this.interruptedFrames = 0;
        this._clearTimer();
        this._setPhase("holdInterrupted");

        this._speakWithThrottle("動作中斷，請重新抬起臀部", 5000);
      }
    } else {
      // 只要有一瞬間抬回來，計數器就歸零
      this.interruptedFrames = 0;
    }
  }

  private _handleHoldInterrupted(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles || !this.baselineHipAngle) return;

    this._speakWithThrottle("動作中斷，請重新抬起臀部", 5000);

    // 重新抬起門檻
    if (angles.hipAngle > this.baselineHipAngle + 8) {
      this.liftFrames += 1;
      if (this.liftFrames >= 10) {
        this.liftFrames = 0;
        this.peakHipAngle = angles.hipAngle;

        this._setPhase("holding");
        this._startHoldTimer(this.remainingHoldSec);
      }
    } else {
      this.liftFrames = 0;
    }
  }

  private _handleAwaitingBaseline(pose: Pose): void {
    const angles = getBestSideAngles(pose);
    if (!angles || !this.baselineHipAngle) return;

    const dropFromPeak = this.peakHipAngle - angles.hipAngle;

    // 放下判定與 Holding 相同邏輯：觸底 或 斷崖掉落
    if (angles.hipAngle < this.baselineHipAngle + 4 || dropFromPeak > 15) {
      this.baselineFrames += 1;
      if (this.baselineFrames >= 3) { // 快速確認
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
        this.opts.speak(`第 ${this.currentRep} 次，請抬起臀部`);
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