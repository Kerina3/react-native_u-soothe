import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function DataPage() {
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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>數據儀表板</Text>
            <Text style={styles.headerSubtitle}>尿失禁患者版本</Text>
          </View>
          <Pressable style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={[styles.summaryCard, styles.greenCard]}>
            <Text style={styles.cardLabel}>運動時間</Text>
            <Text style={styles.cardValue}>5/11 運動10分鐘，評分:80分</Text>
          </View>

          <View style={[styles.summaryCard, styles.orangeCard]}>
            <Text style={styles.cardLabel}>尿溼數據</Text>
            <Text style={[styles.cardValue, styles.orangeCardValue]}>
              5/11 14:00 尿75c.c.
            </Text>
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
          style={styles.navItem}
          onPress={() => handleNavigation("diet")}
        >
          <Text style={styles.navLabel}>飲食</Text>
        </Pressable>
        <Pressable
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => handleNavigation("data")}
        >
          <Text style={[styles.navLabel, styles.navLabelActive]}>數據</Text>
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
    paddingBottom: 104,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFE7DA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCCFB8",
    marginLeft: 12,
  },
  avatarIcon: {
    fontSize: 18,
    color: "#7A6753",
  },
  content: {
    gap: 14,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    minHeight: 86,
    justifyContent: "center",
  },
  greenCard: {
    backgroundColor: "#F2F8F1",
    borderColor: "#D7E8D4",
  },
  orangeCard: {
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
  orangeCardValue: {
    color: "#C57E3D",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6DECF",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
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
