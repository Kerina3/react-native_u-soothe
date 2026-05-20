import PoseUI from "@/components/PoseUI";
import { Pose } from "@/types/types";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function MotionScreen() {
  const onPoseDetected = (poses: Pose) => {
    console.log("Pose detected:", poses);
  };

  return (
    <View style={{ flex: 1 }}>
      <PoseUI onPoseDetected={onPoseDetected} />
    </View>
  );
}
