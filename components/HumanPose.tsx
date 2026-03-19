import { Pose } from "@/types/types";
import { Camera } from "expo-camera";
import { useEffect } from "react";
import { WebView } from "react-native-webview";

interface HumanPoseProps {
  width?: number;
  height?: number;
  enableSkeleton?: boolean;
  enableKeyPoints?: boolean;
  color?: string;
  mode?: "single" | "multiple";
  scoreThreshold?: number;
  isBackCamera?: boolean;
  flipHorizontal?: boolean;
  onPoseDetected?: (pose: Pose) => void;
  isFullScreen?: boolean;
}

export default function HumanPose(p: HumanPoseProps) {
  const onPoseDetected = (pose: Pose) => {
    if (p.onPoseDetected) {
      p.onPoseDetected(pose);
    }
  };

  // 請求相機權限
  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync();
    })();
  }, []);
  const blazePose = "https://pose.vinhintw.com/";

  return (
    <WebView
      source={{
        uri: `${blazePose}/?enableSkeleton=${
          p.enableSkeleton === true ? p.enableSkeleton : "false"
        }&enableKeyPoints=${
          p.enableKeyPoints === true ? p.enableKeyPoints : "false"
        }&color=${p.color ? p.color : ""}&mode=${
          p.mode ? p.mode : ""
        }&scoreThreshold=${
          p.scoreThreshold ? p.scoreThreshold : ""
        }&isBackCamera=${p.isBackCamera ? p.isBackCamera : ""}&flipHorizontal=${
          p.flipHorizontal ? p.flipHorizontal : ""
        }&isFullScreen=${p.isFullScreen ? p.isFullScreen : ""}`,
      }}
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsInlineMediaPlayback={true}
      limitsNavigationsToAppBoundDomains={true}
      onLoadEnd={() => {
        console.log("blazePose WebView loaded");
      }}
      onLoadStart={() => {
        console.log("blazePose WebView loading");
      }}
      onMessage={(event) => {
        try {
          const pose = JSON.parse(event.nativeEvent.data);
          onPoseDetected(pose);
        } catch (e) {
          console.log(e);
        }
      }}
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      startInLoadingState
      allowsFullscreenVideo
    />
  );
}
