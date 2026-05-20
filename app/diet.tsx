import { API_ENDPOINTS } from "@/server/config";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Prediction {
  logs: string[];
  advice: string;
  error?: string;
}

const getCurrentTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
  prediction?: {
    times: string[];
    advice: string;
  };
}

export default function DietScreen() {
  const insets = useSafeAreaInsets();

  // === 狀態與邏輯區 (完全保留你的原始程式碼，一字未改) ===
  const [logs, setLogs] = useState<string[]>(["08:00 喝了一杯大熱美式咖啡"]);
  const [selectedLogTime, setSelectedLogTime] = useState(() =>
    getCurrentTimeString(),
  );
  const [logTextInput, setLogTextInput] = useState("");
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [selectedToiletTime, setSelectedToiletTime] = useState(() =>
    getCurrentTimeString(),
  );
  const [isToiletTimePickerVisible, setIsToiletTimePickerVisible] =
    useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "classic">("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content: "您好👋 我是排尿預測助手，請告訴我您喝了什麼或吃了什麼？",
      timestamp: getCurrentTimeString(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const addLog = () => {
    if (logTextInput.trim()) {
      const time = selectedLogTime || getCurrentTimeString();
      setLogs([...logs, `${time} ${logTextInput.trim()}`]);
      setSelectedLogTime(getCurrentTimeString());
      setLogTextInput("");
    }
  };

  const removeLog = (index: number) => {
    setLogs(logs.filter((_, i) => i !== index));
  };

  const predictUrination = async (logsToUse: string[] = logs) => {
    if (logsToUse.length === 0) {
      alert("請先添加至少一條飲食紀錄");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.predictUrination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: logsToUse }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setPrediction({
        logs: logsToUse,
        advice: data.advice,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMsg);
      setPrediction({
        logs,
        advice: "",
        error: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const addToiletRecord = async () => {
    const time = selectedToiletTime || getCurrentTimeString();
    const record = `${time} 已上過廁所`;
    const updatedLogs = [...logs, record];
    setLogs(updatedLogs);
    setSelectedToiletTime(getCurrentTimeString());

    if (prediction) {
      await predictUrination(updatedLogs);
    }
  };

  const clearAll = () => {
    setLogs([]);
    setPrediction(null);
    setSelectedLogTime(getCurrentTimeString());
    setSelectedToiletTime(getCurrentTimeString());
    setLogTextInput("");
  };

  // 聊天模式邏輯 - 調用真實 API 進行預測
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    // 添加用戶訊息
    const userMsgId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: userMsgId,
      type: "user",
      content: chatInput,
      timestamp: getCurrentTimeString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);

    // 解析並記錄飲食
    const time = getCurrentTimeString();
    const newLog = `${time} ${chatInput.trim()}`;
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);

    // 添加記錄確認訊息
    const recordConfirmId = (Date.now() + 1).toString();
    const recordConfirm: ChatMessage = {
      id: recordConfirmId,
      type: "ai",
      content: `✅ 已記錄：${time} ${chatInput.trim()}`,
      timestamp: getCurrentTimeString(),
    };

    setChatMessages((prev) => [...prev, recordConfirm]);

    // 調用 API 進行預測
    try {
      const response = await fetch(API_ENDPOINTS.predictUrination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: updatedLogs }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API 錯誤: ${response.statusText}`);
      }

      const data = await response.json();

      // 添加 AI 預測訊息
      const aiPredictionId = (Date.now() + 2).toString();
      const aiPredictionMessage: ChatMessage = {
        id: aiPredictionId,
        type: "ai",
        content: "🤖 AI 預測：",
        timestamp: getCurrentTimeString(),
        prediction: {
          times: [data.advice],
          advice: "根據 Gemini AI 分析飲食記錄",
        },
      };

      setChatMessages((prev) => [...prev, aiPredictionMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("API 錯誤:", errorMsg);

      // 添加錯誤訊息
      const errorMsgId = (Date.now() + 2).toString();
      const errorMessage: ChatMessage = {
        id: errorMsgId,
        type: "ai",
        content: `❌ 預測失敗: ${errorMsg}`,
        timestamp: getCurrentTimeString(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    }

    setChatInput("");
  };

  return (
    <View style={styles.mainContainer}>
      {/* 視圖切換按鈕 */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "chat" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("chat")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "chat" && styles.toggleTextActive,
            ]}
          >
            💬 聊天
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "classic" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("classic")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "classic" && styles.toggleTextActive,
            ]}
          >
            📋 詳細
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "chat" ? (
        // 聊天模式
        <View style={styles.chatContainer}>
          <ScrollView
            style={styles.chatMessages}
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.map((msg, idx) => (
              <View
                key={msg.id}
                style={[
                  styles.chatMessageWrapper,
                  msg.type === "user" && styles.chatMessageWrapperRight,
                ]}
              >
                <View
                  style={[
                    styles.chatBubble,
                    msg.type === "user"
                      ? styles.chatBubbleUser
                      : styles.chatBubbleAI,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      msg.type === "user" && styles.chatBubbleUserText,
                    ]}
                  >
                    {msg.content}
                  </Text>

                  {msg.prediction && (
                    <View style={styles.predictionBox}>
                      <Text style={styles.predictionLabel}>⏱️ 排尿預測：</Text>
                      {msg.prediction.times.map((time, i) => (
                        <Text key={i} style={styles.predictionTime}>
                          {time}
                        </Text>
                      ))}
                      <Text style={styles.predictionAdvice}>
                        {msg.prediction.advice}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 聊天輸入框 */}
          <View style={styles.chatInputContainer}>
            <View style={styles.chatInputBox}>
              <Text style={styles.chatInputIcon}>🍴</Text>
              <TextInput
                style={styles.chatInput}
                placeholder="輸入飲食或 /toilet 如廁"
                value={chatInput}
                onChangeText={setChatInput}
                placeholderTextColor="#94A3B8"
              />
            </View>
            <TouchableOpacity
              style={styles.chatSendBtn}
              onPress={handleChatSend}
            >
              <Text style={styles.chatSendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // 經典模式（原有內容）
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 英雄標題區塊 (Hero Header) */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>💧</Text>
            <Text style={styles.heroTitle}>智慧尿液管理</Text>
            <Text style={styles.heroSubtitle}>
              根據您的飲食紀錄，預測最佳如廁時機
            </Text>
          </View>

          {/* 快速記錄區塊 (Card) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📝 快速記錄</Text>

            {/* 飲食輸入框 */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setIsTimePickerVisible(true)}
              >
                <Text style={styles.timeSelectorText}>{selectedLogTime}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="喝了什麼？吃了什麼？"
                  value={logTextInput}
                  onChangeText={setLogTextInput}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.addButton} onPress={addLog}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 飲食時間選擇器 Modal */}
            <Modal
              visible={isTimePickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsTimePickerVisible(false)}
            >
              <TouchableOpacity
                style={styles.timeModalOverlay}
                activeOpacity={1}
                onPress={() => setIsTimePickerVisible(false)}
              >
                <View style={styles.timeModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>選擇飲食時間</Text>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 96 }, (_, index) => {
                      const hour = Math.floor(index / 4);
                      const minute = (index % 4) * 15;
                      const option = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={styles.timeOption}
                          onPress={() => {
                            setSelectedLogTime(option);
                            setIsTimePickerVisible(false);
                          }}
                        >
                          <Text style={styles.timeOptionText}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={styles.divider} />

            {/* 上廁所紀錄框 */}
            <View style={styles.toiletActionRow}>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setIsToiletTimePickerVisible(true)}
              >
                <Text style={styles.timeSelectorText}>
                  {selectedToiletTime}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toiletButton}
                onPress={addToiletRecord}
              >
                <Text style={styles.toiletButtonText}>🚽 記錄已如廁</Text>
              </TouchableOpacity>
            </View>

            {/* 上廁所時間選擇器 Modal */}
            <Modal
              visible={isToiletTimePickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsToiletTimePickerVisible(false)}
            >
              <TouchableOpacity
                style={styles.timeModalOverlay}
                activeOpacity={1}
                onPress={() => setIsToiletTimePickerVisible(false)}
              >
                <View style={styles.timeModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>選擇如廁時間</Text>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 96 }, (_, index) => {
                      const hour = Math.floor(index / 4);
                      const minute = (index % 4) * 15;
                      const option = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={styles.timeOption}
                          onPress={() => {
                            setSelectedToiletTime(option);
                            setIsToiletTimePickerVisible(false);
                          }}
                        >
                          <Text style={styles.timeOptionText}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* 紀錄列表區塊 (Timeline) */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🕒 今日時間軸</Text>
              {logs.length > 0 && (
                <TouchableOpacity onPress={clearAll}>
                  <Text style={styles.clearText}>清空</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.logsList}>
              {logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📝</Text>
                  <Text style={styles.emptyText}>
                    目前還沒有紀錄，請添加您的飲食內容
                  </Text>
                </View>
              ) : (
                logs.map((log, index) => {
                  const [time, ...rest] = log.split(" ");
                  const content = rest.join(" ");
                  const isToilet = content.includes("廁所");
                  return (
                    <View key={index} style={styles.logItem}>
                      <View
                        style={[
                          styles.timelineDot,
                          isToilet && styles.timelineDotToilet,
                        ]}
                      />
                      <View style={styles.logTextGroup}>
                        <Text style={styles.logTime}>{time}</Text>
                        <Text style={styles.logText}>{content}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeLog(index)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* 預測操作按鈕 */}
          <TouchableOpacity
            style={[
              styles.predictButton,
              loading && styles.predictButtonDisabled,
              logs.length === 0 && styles.predictButtonDisabled,
            ]}
            onPress={() => predictUrination()}
            disabled={loading || logs.length === 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.predictButtonText}>✨ 生成智能預測報告</Text>
            )}
          </TouchableOpacity>

          {/* 預測結果區塊 */}
          {prediction && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>💡 系統建議</Text>

              {prediction.error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    ⚠️ 發生錯誤：{prediction.error}
                  </Text>
                </View>
              ) : (
                <View style={styles.adviceBox}>
                  <Text style={styles.adviceText}>{prediction.advice}</Text>
                </View>
              )}

              {/* 紀錄摘要 */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>
                  📊 報告依據 (今日紀錄)：
                </Text>
                {prediction.logs.map((log, index) => (
                  <Text key={index} style={styles.summaryItem}>
                    • {log}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* 知識庫資訊區塊 */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📚 飲食因子影響時間速查</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>☕</Text>
                </View>
                <View>
                  <Text style={styles.infoFactor}>咖啡因</Text>
                  <Text style={styles.infoTime}>15-20 分鐘</Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🍺</Text>
                </View>
                <View>
                  <Text style={styles.infoFactor}>酒精</Text>
                  <Text style={styles.infoTime}>30-120 分鐘</Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🌶️</Text>
                </View>
                <View>
                  <Text style={styles.infoFactor}>辛辣食物</Text>
                  <Text style={styles.infoTime}>120-240 分鐘</Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>💧</Text>
                </View>
                <View>
                  <Text style={styles.infoFactor}>碳酸飲料</Text>
                  <Text style={styles.infoTime}>30-45 分鐘</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// === 全新現代化 UI 樣式 ===
const COLORS = {
  background: "#F8FAFC", // 淺灰藍背景
  card: "#FFFFFF", // 純白卡片
  primary: "#0284C7", // 主色 (海洋藍)
  primaryLight: "#E0F2FE",
  textMain: "#0F172A",
  textSub: "#64748B",
  inputBg: "#F1F5F9",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  toilet: "#8B5CF6", // 上廁所專屬紫色
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // 視圖模式切換
  viewModeToggle: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSub,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  // 聊天模式樣式
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    flexDirection: "column",
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chatMessageWrapper: {
    marginBottom: 12,
    justifyContent: "flex-start",
  },
  chatMessageWrapperRight: {
    justifyContent: "flex-end",
  },
  chatBubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  chatBubbleAI: {
    backgroundColor: COLORS.primaryLight,
  },
  chatBubbleUser: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
  },
  chatBubbleText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  chatBubbleUserText: {
    color: "#FFFFFF",
  },
  predictionBox: {
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  predictionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSub,
    marginBottom: 6,
  },
  predictionTime: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  predictionAdvice: {
    fontSize: 11,
    color: COLORS.textSub,
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  chatInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    gap: 8,
  },
  chatInputIcon: {
    fontSize: 16,
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  chatSendBtnText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  // Hero Card
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#E0F2FE",
    fontWeight: "500",
  },
  // Base Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 16,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.textSub,
    fontWeight: "600",
  },
  // Inputs
  inputGroup: {
    flexDirection: "row",
    gap: 12,
  },
  timeSelector: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 90,
  },
  timeSelectorText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMain,
  },
  dropdownIcon: {
    fontSize: 10,
    color: COLORS.textSub,
    marginLeft: 6,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    alignItems: "center",
    paddingRight: 6,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textMain,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
    marginTop: -2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  toiletActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  toiletButton: {
    flex: 1,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  toiletButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.toilet,
  },
  // Timeline List
  logsList: {
    gap: 16,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginRight: 16,
  },
  timelineDotToilet: {
    backgroundColor: COLORS.toilet,
  },
  logTextGroup: {
    flex: 1,
  },
  logTime: {
    fontSize: 13,
    color: COLORS.textSub,
    fontWeight: "600",
    marginBottom: 2,
  },
  logText: {
    fontSize: 15,
    color: COLORS.textMain,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSub,
    fontSize: 14,
  },
  // Main Action Button
  predictButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    marginVertical: 8,
  },
  predictButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  predictButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Result
  resultCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 12,
  },
  adviceBox: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  adviceText: {
    fontSize: 15,
    color: "#0C4A6E",
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryBox: {
    backgroundColor: "rgba(255,255,255,0.5)",
    padding: 12,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 13,
    color: "#075985",
    marginBottom: 4,
  },
  // Info Grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    width: "48%",
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoFactor: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  infoTime: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  // Modals
  timeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    padding: 24,
  },
  timeModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    maxHeight: "70%",
    paddingVertical: 16,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  timeOption: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  timeOptionText: {
    fontSize: 18,
    color: COLORS.textMain,
    fontWeight: "500",
  },
});
