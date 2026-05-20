import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="kegel" />
      <Stack.Screen name="patient-dashboard" />
      <Stack.Screen name="diet" />
      <Stack.Screen name="data" />
    </Stack>
  );
}
