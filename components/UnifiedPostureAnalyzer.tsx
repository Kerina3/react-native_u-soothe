import { Pose, PostureType, UnifiedPostureResult } from "@/types/types";
import { analyzePosture, getPostureDescription } from "@/utils/pose-analyzer";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface UnifiedPostureAnalyzerProps {
  pose: Pose | null;
  onAnalysisComplete?: (result: UnifiedPostureResult) => void;
}

/**
 * 統一的姿勢分析顯示組件
 * 實時分析並顯示坐、站、躺三種姿勢的分析結果
 */
const UnifiedPostureAnalyzer: React.FC<UnifiedPostureAnalyzerProps> = ({
  pose,
  onAnalysisComplete,
}) => {
  const [result, setResult] = useState<UnifiedPostureResult | null>(null);

  useEffect(() => {
    if (!pose) return;

    const analysisResult = analyzePosture(pose);
    setResult(analysisResult);

    if (onAnalysisComplete) {
      onAnalysisComplete(analysisResult);
    }
  }, [pose, onAnalysisComplete]);

  if (!result) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>正在初始化姿勢檢測...</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (result.primaryPosture) {
      case PostureType.SITTING:
        return result.detectedPostures.sitting?.isProperPosture
          ? "#51CF66"
          : "#FFD93D";
      case PostureType.STANDING:
        return result.detectedPostures.standing?.isProperPosture
          ? "#51CF66"
          : "#FFD93D";
      case PostureType.LYING:
        return result.detectedPostures.lying?.isProperPosture
          ? "#51CF66"
          : "#FFD93D";
      default:
        return "#FF6B6B";
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.8) return "#51CF66";
    if (score > 0.6) return "#FFD93D";
    return "#FF6B6B";
  };

  const getPostureLabel = (): string => {
    switch (result.primaryPosture) {
      case PostureType.SITTING:
        return "坐姿";
      case PostureType.STANDING:
        return "站姿";
      case PostureType.LYING:
        return "躺姿";
      default:
        return "未知";
    }
  };

  const renderPostureDetail = () => {
    switch (result.primaryPosture) {
      case PostureType.SITTING:
        return result.detectedPostures.sitting ? (
          <View>
            {result.detectedPostures.sitting.backAngle !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>背部角度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.sitting.scores.backAngleScore,
                        ),
                      },
                    ]}
                  >
                    {result.detectedPostures.sitting.backAngle.toFixed(1)}°
                  </Text>
                  <Text style={styles.metricTarget}>目標: 75-105°</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.sitting.scores.backAngleScore *
                        100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.sitting.scores.backAngleScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}

            {result.detectedPostures.sitting.kneeAngle !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>膝蓋角度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.sitting.scores.kneeAngleScore,
                        ),
                      },
                    ]}
                  >
                    {result.detectedPostures.sitting.kneeAngle.toFixed(1)}°
                  </Text>
                  <Text style={styles.metricTarget}>目標: 85-95°</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.sitting.scores.kneeAngleScore *
                        100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.sitting.scores.kneeAngleScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}
          </View>
        ) : null;

      case PostureType.STANDING:
        return result.detectedPostures.standing ? (
          <View>
            {result.detectedPostures.standing.bodyAlignment !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>身體對齐度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.standing.scores
                            .alignmentScore,
                        ),
                      },
                    ]}
                  >
                    {(
                      result.detectedPostures.standing.scores.alignmentScore *
                      100
                    ).toFixed(0)}
                    %
                  </Text>
                  <Text style={styles.metricTarget}>目標: 80% 以上</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.standing.scores.alignmentScore *
                        100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.standing.scores.alignmentScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}

            {result.detectedPostures.standing.shoulderAlignment !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>肩膀水平度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.standing.scores.shoulderScore,
                        ),
                      },
                    ]}
                  >
                    {(
                      result.detectedPostures.standing.scores.shoulderScore *
                      100
                    ).toFixed(0)}
                    %
                  </Text>
                  <Text style={styles.metricTarget}>目標: 85% 以上</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.standing.scores.shoulderScore *
                        100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.standing.scores.shoulderScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}
          </View>
        ) : null;

      case PostureType.LYING:
        return result.detectedPostures.lying ? (
          <View>
            {result.detectedPostures.lying.spineAlignment !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>脊椎對齐度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.lying.scores.spineScore,
                        ),
                      },
                    ]}
                  >
                    {(
                      result.detectedPostures.lying.scores.spineScore * 100
                    ).toFixed(0)}
                    %
                  </Text>
                  <Text style={styles.metricTarget}>目標: 85% 以上</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.lying.scores.spineScore * 100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.lying.scores.spineScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}

            {result.detectedPostures.lying.neckAngle !== null && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>頸部角度</Text>
                <View style={styles.metricRow}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: getScoreColor(
                          result.detectedPostures.lying.scores.neckScore,
                        ),
                      },
                    ]}
                  >
                    {result.detectedPostures.lying.neckAngle.toFixed(1)}°
                  </Text>
                  <Text style={styles.metricTarget}>目標: 175-185°</Text>
                </View>
                <View
                  style={[
                    styles.scoreBar,
                    {
                      width: `${
                        result.detectedPostures.lying.scores.neckScore * 100
                      }%`,
                      backgroundColor: getScoreColor(
                        result.detectedPostures.lying.scores.neckScore,
                      ),
                    },
                  ]}
                />
              </View>
            )}
          </View>
        ) : null;

      default:
        return null;
    }
  };

  const getFeedback = (): string[] => {
    switch (result.primaryPosture) {
      case PostureType.SITTING:
        return result.detectedPostures.sitting?.postureFeedback || [];
      case PostureType.STANDING:
        return result.detectedPostures.standing?.postureFeedback || [];
      case PostureType.LYING:
        return result.detectedPostures.lying?.postureFeedback || [];
      default:
        return [];
    }
  };

  return (
    <View style={styles.container}>
      {/* 狀態欄 */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusTitle}>{getPostureDescription(result)}</Text>
        <Text style={styles.postureType}>{getPostureLabel()}</Text>
        {result.overallScore > 0 && (
          <Text style={styles.confidence}>
            信心度: {(result.overallScore * 100).toFixed(0)}%
          </Text>
        )}
      </View>

      {/* 主要信息區 */}
      <ScrollView style={styles.contentScroll}>
        {result.primaryPosture !== PostureType.UNKNOWN ? (
          <>
            {/* 姿勢指標 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>姿勢指標</Text>
              {renderPostureDetail()}
            </View>

            {/* 反饋信息 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>改進建議</Text>
              {getFeedback().map((feedback, index) => (
                <View key={index} style={styles.feedbackBox}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>未檢測到姿勢</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>
                無法清晰檢測姿勢，請調整位置或光線
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  statusBar: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statusTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  postureType: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  confidence: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  contentScroll: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  metricBox: {
    marginBottom: 12,
  },
  metricLabel: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  metricTarget: {
    color: "#888",
    fontSize: 11,
  },
  scoreBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#888",
  },
  feedbackBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD93D",
  },
  feedbackText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 18,
  },
  loadingText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 16,
  },
});

export default UnifiedPostureAnalyzer;
