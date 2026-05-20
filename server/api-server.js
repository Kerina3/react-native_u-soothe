/**
 * AIoT 智慧尿液健康管理系統 - API 後端服務器
 * 安全處理 Gemini API 呼叫，保護 API 密鑰
 */

const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const NCBI_SEARCH_TERMS = [
  '(("Urinary Bladder, Overactive"[MeSH Terms]) OR ("urinary urgency"[Title/Abstract]) OR ("lower urinary tract symptoms"[Title/Abstract])) AND ((caffeine[Title/Abstract]) OR (coffee[Title/Abstract]) OR (alcohol[Title/Abstract]) OR (carbonated[Title/Abstract]) OR (spicy[Title/Abstract]))',
  '(("Urination Disorders"[MeSH Terms]) OR ("overactive bladder"[Title/Abstract])) AND ((dietary factors[Title/Abstract]) OR (beverage[Title/Abstract]) OR (fluid intake[Title/Abstract]) OR (diet[Title/Abstract]))',
  '((nocturia[Title/Abstract]) OR ("urinary frequency"[Title/Abstract]) OR ("urge incontinence"[Title/Abstract])) AND ((caffeine[Title/Abstract]) OR (alcohol[Title/Abstract]) OR (bladder irritants[Title/Abstract]))',
];
const NCBI_MAX_ARTICLES = 30;
const CRAWLER_MIN_INTERVAL_MS = 30 * 60 * 1000;
let lastCrawlerRunAt = 0;

// ==========================================
// 步驟 1: 初始化 Gemini API
// ==========================================

let genai;
let model;
let activeModelName;
let initialized = false;
const MODEL_CANDIDATES = [
  "gemini-1.5-flash-8b", // 🚀 殺手鐧：最輕量、最快、最不可能塞車的版本 (首選)
  "gemini-1.5-flash-latest", // 🛡️ 備用 1：標準 Flash 最新版
  "gemini-1.5-flash-002", // 🛡️ 備用 2：標準 Flash 穩定版
  "gemini-2.5-flash", // 備用 3：最新 2.5 版
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(error) {
  const message = ((error && error.message) || "").toLowerCase();
  const status = error?.status || 0;
  return (
    status === 503 ||
    status === 429 ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("429") ||
    message.includes("resource_exhausted")
  );
}

async function generateAdviceWithRetry(prompt) {
  let lastError;

  const orderedModels = [
    ...(activeModelName ? [activeModelName] : []),
    ...MODEL_CANDIDATES.filter((name) => name !== activeModelName),
  ];

  for (const modelName of orderedModels) {
    const candidateModel = genai.getGenerativeModel({ model: modelName });

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await candidateModel.generateContent(prompt);
        activeModelName = modelName;
        model = candidateModel;
        return response.response.text();
      } catch (error) {
        lastError = error;

        if (isTransientGeminiError(error) && attempt < 5) {
          const waitTime = 1000 * (Math.pow(2, attempt - 1) + Math.random());
          console.log(
            `⏳ 重試 ${attempt}/5，等待 ${Math.round(waitTime)}ms...`,
          );
          await sleep(waitTime);
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error("Gemini 請求失敗");
}

async function initializeGemini() {
  if (initialized) return;

  try {
    // 動態導入 Gemini SDK
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("缺少 GOOGLE_API_KEY 環境變數");
    }

    genai = new GoogleGenerativeAI(apiKey);

    const modelName = MODEL_CANDIDATES[0];
    model = genai.getGenerativeModel({ model: modelName });
    activeModelName = modelName;
    initialized = true;
    console.log(`✅ Gemini API 初始化成功，使用模型：${modelName}`);
  } catch (error) {
    console.error(
      "❌ Gemini API 初始化失敗:",
      (error && error.message) || error,
    );
    throw error;
  }
}

// ==========================================
// 步驟 2: 載入知識庫 (CSV 資料)
// ==========================================

let knowledgeBase = "";

function loadKnowledgeBase() {
  try {
    const csvPath = path.join(__dirname, "urinary_dataset.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // 解析 CSV，提取 Text_Content 欄位
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");
    const textContentIndex = headers.indexOf("Text_Content");

    if (textContentIndex === -1) {
      throw new Error("CSV 文件中未找到 Text_Content 欄位");
    }

    const contents = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 簡單的 CSV 解析 (處理引號)
      const cells = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cells.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim().replace(/^"|"$/g, ""));

      if (cells[textContentIndex]) {
        contents.push(cells[textContentIndex]);
      }
    }

    knowledgeBase = contents.join("\n");
    console.log(`✅ 知識庫已載入 (${contents.length} 條規則)`);
  } catch (error) {
    console.error("⚠️ 知識庫載入失敗:", error.message);
    knowledgeBase = "無法讀取知識庫，請確保 urinary_dataset.csv 存在。";
  }
}

function decodeXmlEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlTags(text) {
  return decodeXmlEntities((text || "").replace(/<[^>]+>/g, " "));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function fetchPubMedIds(term, retmax) {
  const endpoint =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&retmode=json&retmax=${retmax}&sort=relevance&term=${encodeURIComponent(term)}`;

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "u-soothe-knowledge-crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`NCBI esearch 失敗: ${response.status}`);
  }

  const data = await response.json();
  return data?.esearchresult?.idlist || [];
}

async function fetchPubMedSummary(idList) {
  if (idList.length === 0) return [];

  const endpoint =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" +
    `?db=pubmed&retmode=json&id=${idList.join(",")}`;

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "u-soothe-knowledge-crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`NCBI esummary 失敗: ${response.status}`);
  }

  const data = await response.json();
  const result = data?.result || {};

  return idList.map((id) => {
    const item = result[id] || {};
    return {
      pmid: id,
      title: stripHtmlTags(item.title || ""),
      publishedAt: item.pubdate || "",
    };
  });
}

async function fetchPubMedAbstractMap(idList) {
  if (idList.length === 0) return new Map();

  const endpoint =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi" +
    `?db=pubmed&retmode=xml&id=${idList.join(",")}`;

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "u-soothe-knowledge-crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`NCBI efetch 失敗: ${response.status}`);
  }

  const xml = await response.text();
  const articleBlocks =
    xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  const abstractMap = new Map();

  for (const block of articleBlocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const pmid = pmidMatch ? pmidMatch[1] : null;
    if (!pmid) continue;

    const abstractMatches = [
      ...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g),
    ];
    const mergedAbstract = abstractMatches
      .map((m) => stripHtmlTags(m[1]))
      .filter(Boolean)
      .join(" ")
      .trim();

    abstractMap.set(pmid, mergedAbstract);
  }

  return abstractMap;
}

async function crawlNcbiKnowledgeRows() {
  if (typeof fetch !== "function") {
    throw new Error("目前 Node.js 環境不支援 fetch，請升級到 Node.js 18+");
  }

  const articleMap = new Map();

  for (const term of NCBI_SEARCH_TERMS) {
    const ids = await fetchPubMedIds(term, NCBI_MAX_ARTICLES);
    const summaries = await fetchPubMedSummary(ids);
    const abstractMap = await fetchPubMedAbstractMap(ids);

    for (const item of summaries) {
      const abstract = abstractMap.get(item.pmid) || "";
      const title = item.title || "Untitled";
      const textContent = `${title} ${abstract}`.trim();

      if (!textContent) continue;

      if (!articleMap.has(item.pmid)) {
        articleMap.set(item.pmid, {
          title,
          summary: abstract,
          publishedAt: item.publishedAt || "",
          textContent,
        });
      }
    }
  }

  return [...articleMap.values()].slice(0, NCBI_MAX_ARTICLES);
}

function writeKnowledgeCsv(rows) {
  const csvPath = path.join(__dirname, "urinary_dataset.csv");
  const header = "Title,Summary,Published_At,Text_Content\n";
  const body = rows
    .map((row) => {
      return [
        csvEscape(row.title),
        csvEscape(row.summary),
        csvEscape(row.publishedAt),
        csvEscape(row.textContent),
      ].join(",");
    })
    .join("\n");

  fs.writeFileSync(csvPath, `${header}${body}\n`, "utf-8");
}

async function refreshKnowledgeBaseFromCrawler() {
  const now = Date.now();
  if (now - lastCrawlerRunAt < CRAWLER_MIN_INTERVAL_MS) {
    return;
  }

  const rows = await crawlNcbiKnowledgeRows();
  if (rows.length === 0) {
    throw new Error("NCBI 未抓到可用文獻內容");
  }

  writeKnowledgeCsv(rows);
  loadKnowledgeBase();
  lastCrawlerRunAt = now;
  console.log(`🕷️ 爬蟲更新完成，共 ${rows.length} 筆文獻`);
}

// ==========================================
// 步驟 3: 處理預測請求
// ==========================================

async function handlePredictionRequest(logsArray) {
  try {
    await initializeGemini();

    try {
      await refreshKnowledgeBaseFromCrawler();
    } catch (crawlError) {
      console.warn("⚠️ 爬蟲更新失敗，改用既有知識庫:", crawlError.message);
    }

    if (!knowledgeBase || knowledgeBase.startsWith("無法讀取")) {
      loadKnowledgeBase();
    }

    const logsStr = logsArray.join("\n");

    const prompt = `
  你現在是「AIoT 智慧尿液健康管理系統」的分析大腦。
  請根據以下文獻規則庫與使用者的飲食紀錄進行推算：
  【文獻規則庫】
  ${knowledgeBase}

  【今日飲食紀錄】
  ${logsStr}

  任務要求：
  1. 極度簡潔：字數嚴格控制在 30 到 50 字以內，絕對不要任何寒暄、開場白或廢話。
  2. 直擊重點：直接說出「哪個飲食因子」會導致利尿。
  3. 精準預測：明確給出「大約幾分鐘後」或「預計幾點幾分」會想上廁所。

  回覆範例：「您剛喝了美式咖啡（含咖啡因），預計在 15 到 30 分鐘後（約 08:30）會有較強烈的尿意，請提前留意廁所位置。」
  `;

    const aiAdvice = await generateAdviceWithRetry(prompt);

    return {
      success: true,
      advice: aiAdvice,
    };
  } catch (error) {
    console.error("❌ 預測生成失敗:", error);

    const rawMessage = error?.message || "無法生成預測，請稍後重試。";
    let userMessage = "無法生成預測，請稍後重試。";
    let statusCode = 500;

    if (rawMessage.includes("GOOGLE_API_KEY")) {
      userMessage = "伺服器尚未設定 GOOGLE_API_KEY。";
    } else if (isTransientGeminiError(error)) {
      userMessage = "Gemini 目前流量較高，系統已自動重試，請稍後再試。";
      statusCode = 503;
    }

    return {
      success: false,
      error: userMessage,
      detail: rawMessage,
      statusCode,
    };
  }
}

// ==========================================
// 步驟 4: HTTP 伺服器
// ==========================================

const server = http.createServer(async (req, res) => {
  // CORS 設定
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 預測 API 端點
  if (pathname === "/api/predict-urination" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const { logs } = JSON.parse(body);

        if (!Array.isArray(logs) || logs.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "無效的飲食紀錄" }));
          return;
        }

        const result = await handlePredictionRequest(logs);

        const statusCode = result.success ? 200 : result.statusCode || 500;
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "請求解析失敗" }));
      }
    });

    return;
  }

  // 根路由/歡迎頁面
  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "AIoT 尿液健康管理系統 API",
        routes: {
          predict: "/api/predict-urination",
          health: "/health",
        },
      }),
    );
    return;
  }

  // 健康檢查端點
  if (pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", initialized }));
    return;
  }

  // 未找到路由
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "路由未找到" }));
});

// ==========================================
// 步驟 5: 啟動伺服器
// ==========================================

const PORT = process.env.PORT || 3001;

loadKnowledgeBase();

server.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🚀 AIoT 尿液健康管理系統 - API 伺服器`);
  console.log(`Server 運行於: http://localhost:${PORT}`);
  console.log(`${"=".repeat(50)}\n`);

  // 初始化 Gemini
  initializeGemini().catch((error) => {
    console.error("⚠️ 警告: 無法初始化 Gemini API");
    console.error("請確保已設定 GOOGLE_API_KEY 環境變數");
  });
});

process.on("SIGINT", () => {
  console.log("\n\n👋 伺服器已關閉");
  process.exit(0);
});
