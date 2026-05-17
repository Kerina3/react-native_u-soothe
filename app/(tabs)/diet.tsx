import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function DietPage() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === "home") {
      router.push("/");
    } else if (route === "patient") {
      router.push("/patient-dashboard" as any);
    } else if (route === "kegel") {
      router.push("/kegel" as any);
    } else {
      router.push(route as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>飲食分析</Text>
            <Text style={styles.headerSubtitle}>患者版本</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={[styles.card, styles.cardGreen]}>
            <Text style={styles.cardLabel}>今日飲食</Text>
            <Text style={styles.cardValue}>早餐正常，午餐已記錄</Text>
          </View>
          <View style={[styles.card, styles.cardOrange]}>
            <Text style={styles.cardLabel}>建議</Text>
            <Text style={styles.cardValueOrange}>補充水分，避免刺激性飲食</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部導航欄 */}
      <View style={styles.bottomNav}>
        <Pressable
          style={styles.navItem}
          onPress={() => handleNavigation("home")}
        >
          <Text style={styles.navLabel}>主頁</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => handleNavigation("kegel")}
        >
          <Text style={styles.navLabel}>凱格爾</Text>
        </Pressable>
        <Pressable
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => handleNavigation("diet")}
        >
          <Text style={[styles.navLabel, styles.navLabelActive]}>飲食</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => handleNavigation("data")}
        >
          <Text style={styles.navLabel}>數據</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 92,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: "#8A7A67",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#6A543F",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#8A7A67",
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  content: {
    gap: 14,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    minHeight: 86,
    justifyContent: "center",
  },
  cardGreen: {
    backgroundColor: "#F2F8F1",
    borderColor: "#D7E8D4",
  },
  cardOrange: {
    backgroundColor: "#FFF5EB",
    borderColor: "#F1D9BF",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A67",
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: "#7C9565",
  },
  cardValueOrange: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: "#C57E3D",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DECF",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 6,
  },
  navItem: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemActive: {
    backgroundColor: "#B68B5A",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AA9A84",
  },
  navLabelActive: {
    color: "#FFFFFF",
  },
});
