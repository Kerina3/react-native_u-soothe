import { Pose } from "@/types/types";
import { useState } from "react";
import { View } from "react-native";
import HumanPose from "./HumanPose";
import SittingPostureAnalyzer from "./SittingPostureAnalyzer";
import UnifiedPostureAnalyzer from "./UnifiedPostureAnalyzer";
import { AspectRatio } from "./ui/aspect-ratio";

interface PoseUIProps {
  onPoseDetected?: (poses: Pose) => void;
  mode?: "sitting-only" | "unified";
}

const PoseUI: React.FC<PoseUIProps> = ({
  onPoseDetected,
  mode = "unified",
}) => {
  // 使用 useState 來追蹤最新的姿勢數據
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);

  const handlePoseDetected = (pose: Pose) => {
    setCurrentPose(pose);
    if (onPoseDetected) {
      onPoseDetected(pose);
    }
  };

  return (
    <View className="flex flex-1 flex-row">
      {/* 左側：相機視圖 */}
      <View className="flex-1">
        <AspectRatio ratio={9 / 16}>
          <HumanPose
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
        </AspectRatio>
      </View>

      {/* 右側：分析面板 */}
      <View className="flex-1 bg-gray-900">
        {mode === "sitting-only" && (
          <SittingPostureAnalyzer pose={currentPose} />
        )}
        {mode === "unified" && <UnifiedPostureAnalyzer pose={currentPose} />}
      </View>
    </View>
  );
};

export default PoseUI;
