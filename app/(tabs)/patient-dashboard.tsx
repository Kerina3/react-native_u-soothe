import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function PatientDashboard() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === "home") {
      router.push("/");
    } else if (route === "patient") {
      router.push("/patient-dashboard" as any);
    } else if (route === "kegel") {
      router.push("/kegel" as any);
    } else {
      router.push(`/${route}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💪</Text>
            <View style={styles.cardTitle}>
              <Text style={styles.cardTitleText}>運動時間</Text>
              <Text style={styles.cardSubtitle}>本週數據</Text>
            </View>
          </View>
          <View style={styles.cardStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>4小時20分</Text>
              <Text style={styles.statLabel}>本週運動</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>連續7天</Text>
              <Text style={styles.statLabel}>連續記錄</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💧</Text>
            <View style={styles.cardTitle}>
              <Text style={styles.cardTitleText}>尿溼數據</Text>
              <Text style={styles.cardSubtitle}>過去7天</Text>
            </View>
          </View>
          <View style={styles.cardStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>2.1次</Text>
              <Text style={styles.statLabel}>平均每天</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>↓15%</Text>
              <Text style={styles.statLabel}>周比改善</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🚻</Text>
            <Text style={styles.cardTitleText}>廁所導航</Text>
          </View>
          <View style={styles.navButtons}>
            <Pressable style={styles.navButton}>
              <Text style={styles.navButtonText}>📍 最近廁所</Text>
            </Pressable>
            <Pressable style={[styles.navButton, styles.navButtonSecondary]}>
              <Text style={styles.navButtonSecondaryText}>🗺️ 地圖</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable
          style={styles.navItem}
          onPress={() => handleNavigation("home")}
        >
          <Text style={styles.navLabel}>主頁</Text>
        </Pressable>
        <Pressable
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => handleNavigation("kegel")}
        >
          <Text style={[styles.navLabel, styles.navLabelActive]}>凱格爾</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => handleNavigation("diet")}
        >
          <Text style={styles.navLabel}>飲食</Text>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
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
  },
  avatarIcon: {
    fontSize: 18,
    color: "#7A6753",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E6DECF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
  },
  cardTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6A543F",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#8A7A67",
    marginTop: 2,
  },
  cardStats: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C9565",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#8A7A67",
  },
  navButtons: {
    flexDirection: "row",
    gap: 10,
  },
  navButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#B68B5A",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  navButtonSecondary: {
    backgroundColor: "#E6DECF",
  },
  navButtonSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5E5145",
  },
  spacer: {
    height: 40,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6DECF",
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 16,
    justifyContent: "space-between",
    gap: 6,
  },
  navItem: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemActive: {
    backgroundColor: "#F2F8F1",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AA9A84",
  },
  navLabelActive: {
    color: "#7C9565",
  },
});
