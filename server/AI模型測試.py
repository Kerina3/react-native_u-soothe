import os
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv; load_dotenv()

# ==========================================
# 步驟 1: 設定 Gemini API
# ==========================================
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("❌ 錯誤：找不到金鑰！請檢查環境變數設定。")
    exit()

genai.configure(api_key=api_key)
available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
model_name = 'models/gemini-1.5-flash' if 'models/gemini-1.5-flash' in available_models else available_models[0]
print(f"✅ 成功連線！使用模型：{model_name}")
model = genai.GenerativeModel(model_name)

# ==========================================
# 步驟 2: 載入系統大腦 (文獻知識庫)
# ==========================================
print("🧠 載入文獻規則庫中...")
try:
    df = pd.read_csv('urinary_dataset.csv')
    # 將規則庫轉換成字串，方便交給 AI 參考
    knowledge_base = "\n".join(df['Text_Content'].dropna().tolist())
except FileNotFoundError:
    knowledge_base = "無法讀取 urinary_dataset.csv，請確保檔案存在。"

# ==========================================
# 步驟 3: 接收使用者輸入 (動態日常紀錄)
# ==========================================
# 這裡就是你輸入使用者一天飲食的地方，未來可以串接 App 表單或 LINE 訊息
user_daily_logs = [
    "07:30 喝1杯250ml的咖啡",
    "08:10 喝1杯500ml的水",
]
logs_str = "\n".join(user_daily_logs)

# ==========================================
# 步驟 4: 請 Gemini 結合知識庫與紀錄進行預測
# ==========================================
print("⏳ 正在計算排尿預測時間與生成建議...")

prompt = f"""
你現在是「AIoT 智慧尿液健康管理系統」的專業助理。
請仔細閱讀以下醫學文獻規則庫，這包含了不同飲食因子對膀胱的影響時間：
【文獻規則庫】
{knowledge_base}

接下來，請檢視使用者今天的飲食紀錄：
【今日飲食紀錄】
{logs_str}

任務要求：
1. 找出紀錄中可能引發急迫性尿意的高風險因子（如咖啡、茶、酒精）。
2. 根據文獻規則庫的發作時間（如咖啡 15-30 分鐘，酒精 1-2 小時），推算使用者在哪幾個時間點需要特別注意。
3. 以專業、體貼的語氣，寫一段大約 150 字的預警建議給使用者。不要提及「根據文獻」等生硬字眼，直接給予生活化的提醒。
"""

try:
    response = model.generate_content(prompt)
    ai_advice = response.text
except Exception as e:
    ai_advice = f"AI 生成建議時出錯：{e}"

# ==========================================
# 步驟 5: 成果展示
# ==========================================
print("\n" + "="*50)
print("【AIoT 智慧尿液健康管理系統 - 個人化預測報告】")
print("="*50)
print("📝 今日紀錄摘要：")
print(logs_str)
print("-" * 50)
print("💡 系統預警與如廁建議：")
print(ai_advice)
print("="*50)