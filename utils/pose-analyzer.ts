import { Pose, PostureType, UnifiedPostureResult } from "@/types/types";
import { detectSittingPosture } from "./sitting-pose-detector";
import { detectStandingPosture } from "./standing-pose-detector";
import { detectLyingPosture } from "./lying-pose-detector";

/**
 * 統一姿勢分析模塊
 * 整合坐姿、站姿、躺姿檢測器，返回統一的姿勢分析結果
 */

/**
 * 分析人體姿勢，同時檢測坐姿、站姿和躺姿
 * @param pose - 包含身體關鍵點的 Pose 對象
 * @returns UnifiedPostureResult - 包含所有姿勢分析結果的統一對象
 */
export function analyzePosture(pose: Pose): UnifiedPostureResult {
  // 執行三種姿勢檢測
  const sittingResult = detectSittingPosture(pose);
  const standingResult = detectStandingPosture(pose);
  const lyingResult = detectLyingPosture(pose);

  // 收集各姿勢的信心度
  const confidences: { type: PostureType; confidence: number }[] = [
    {
      type: PostureType.SITTING,
      confidence: sittingResult.isSitting ? sittingResult.confidence : 0,
    },
    {
      type: PostureType.STANDING,
      confidence: standingResult.isStanding ? standingResult.confidence : 0,
    },
    {
      type: PostureType.LYING,
      confidence: lyingResult.isLying ? lyingResult.confidence : 0,
    },
  ];

  // 找出信心度最高的姿勢作為主要姿勢
  const best = confidences.reduce(
    (prev, curr) => (curr.confidence > prev.confidence ? curr : prev),
    { type: PostureType.UNKNOWN, confidence: 0 },
  );

  const primaryPosture =
    best.confidence > 0 ? best.type : PostureType.UNKNOWN;

  // 計算綜合評分（取主要姿勢的評分）
  let overallScore = 0;
  if (primaryPosture === PostureType.SITTING) {
    const scores = sittingResult.scores;
    overallScore =
      (scores.backAngleScore +
        scores.kneeAngleScore +
        scores.hipPositionScore +
        scores.feetPositionScore) /
      4;
  } else if (primaryPosture === PostureType.STANDING) {
    const scores = standingResult.scores;
    overallScore =
      (scores.alignmentScore +
        scores.shoulderScore +
        scores.kneeScore +
        scores.bodyHeightScore) /
      4;
  } else if (primaryPosture === PostureType.LYING) {
    const scores = lyingResult.scores;
    overallScore =
      (scores.alignmentScore +
        scores.spineScore +
        scores.neckScore +
        scores.supportScore) /
      4;
  }

  return {
    postureType: primaryPosture,
    detectedPostures: {
      sitting: sittingResult.isSitting ? sittingResult : null,
      standing: standingResult.isStanding ? standingResult : null,
      lying: lyingResult.isLying ? lyingResult : null,
    },
    primaryPosture,
    overallScore,
  };
}
