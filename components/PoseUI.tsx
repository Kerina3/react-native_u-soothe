import { Pose } from "@/types/types";
import HumanPose from "./HumanPose";
import { AspectRatio } from "./ui/aspect-ratio";

interface PoseUIProps {
  onPoseDetected: (poses: Pose) => void;
}

const PoseUI: React.FC<PoseUIProps> = ({ onPoseDetected }) => {
  return (
    <AspectRatio ratio={9 / 16}>
      <HumanPose
        enableKeyPoints={true}
        flipHorizontal={false}
        isBackCamera={false}
        color={"255, 255, 255"}
        onPoseDetected={onPoseDetected}
        enableSkeleton={true}
        scoreThreshold={0.5}
        mode="multiple"
        isFullScreen={true}
      />
    </AspectRatio>
  );
};

export default PoseUI;
