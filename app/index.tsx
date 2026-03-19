import PoseUI from "@/components/PoseUI";
import { Pose } from "@/types/types";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function Index() {
  // 處理檢測到的姿勢數據的回調函數
  // 當PoseUI檢測到姿勢時，會調用這個函數並傳遞姿勢數據
  const onPoseDetected = (poses: Pose) => {
    // 這裡可以處理檢測到的姿勢數據，例如更新狀態或觸發其他操作
    console.log("Pose detected:", poses);
  };

  return (
    <View className="flex flex-1">
      <Stack.Screen
        options={{ headerShown: true, headerTitle: "測試MediaPipe" }}
      />
      <PoseUI onPoseDetected={onPoseDetected} />
    </View>
  );
}
