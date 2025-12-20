# 架構概覽 (Architecture Overview)

這份文件是一份關鍵的、動態的模板，旨在讓 Agent 或開發者能快速、全面地理解程式碼庫的架構，以便從第一天起就能高效地導航並進行貢獻。請隨著程式碼庫的演變更新此文件。

## 1. 專案結構 (Project Structure)

本專案是使用 React、Vite 和現代 AI 服務構建的 **Chrome 擴充功能 (Chrome Extension)**。

├── src/
│   ├── assets/              # 靜態資源 (圖片、圖標)
│   ├── components/          # 可重用的 UI 元件
│   │   └── ui/              # 原子級 UI 元件 (Button, Card, Input) - 基於 shadcn/ui
│   ├── contexts/            # React Context API
│   │   └── JobContext.tsx   # 全域狀態 (Profile, Jobs, Actions) - 包含資料同步邏輯
│   ├── lib/                 # 工具函式庫
│   │   └── utils.ts         # CN (Class Name) helper
│   ├── options/             # 選項頁面邏輯
│   │   ├── Dashboard.tsx    # 職缺儀表板 (My Jobs, Status Management)
│   │   ├── Options.tsx      # 選項頁面主佈局 (Tabs: Dashboard, Settings, Usage)
│   │   ├── Settings.tsx     # 設定頁面 (Profile Form, API Key, Model Selection)
│   │   └── UsageStats.tsx   # 用量統計 (Token Usage, Cost Estimation)
│   ├── services/            # 核心業務邏輯與外部服務
│   │   ├── ai.ts            # 統一 AI 服務介面 (Facade, Provider 路由)
│   │   ├── gemini.ts        # Google Gemini API 實作 (含 Prompt, Cost Calc, Commute/Score Rules)
│   │   ├── openai.ts        # OpenAI API 實作 (含 Prompt, Cost Calc, Commute/Score Rules)
│   │   ├── scraper.ts       # DOM 爬蟲 (注入腳本) - 104/Yourator/LinkedIn
│   │   └── storage.ts       # Chrome Local Storage 包裝器 (Profile, Jobs, UsageLogs)
│   ├── sidepanel/           # Chrome SidePanel 邏輯 (可選)
│   ├── types/               # 共用的 TypeScript 介面定義
│   │   └── index.ts         # UserProfile, JobEntry, AnalysisResult (含 CommuteLabel, MatchScoreExplanation), UsageLog
│   ├── utils/               # 輔助函式
│   │   └── pricing.ts       # 費率計算與定價表
│   ├── App.css              # App 特定樣式
│   ├── App.tsx              # 主要 Popup 邏輯 (選單、分析流程控制、結果展示含 Commute Badge & Score Reasoning)
│   ├── index.css            # Tailwind CSS 全域樣式
│   └── main.tsx             # 應用程式進入點
├── dist/                    # 編譯後的生產版本 (Build)
├── public/                  # 複製到根目錄的靜態檔案 (圖標、manifest.json)
├── manifest.json            # Chrome Extension Manifest (V3)
├── vite.config.ts           # Vite 建置設定
└── tailwind.config.js       # Tailwind CSS 設定

## 2. 高層系統圖 (High-Level System Diagram)

[使用者] <--> [Chrome 擴充功能 Popup / Options Page]
                    |
                    +--> [DOM 爬蟲腳本] <--> [當前瀏覽器分頁 (104, LinkedIn)]
                    |
                    +--> [AI 服務介面 (Facade)]
                    |         |
                    |         +--> [OpenAI API (GPT-4o)]
                    |         |
                    +--> [Google Gemini API (Multi-Model)]
                    |
                    +--> [Chrome Local Storage]
                              |
                              +--> User Profile (含設定, Keys)
                              +--> Saved Jobs (含 AI 分析結果, Commute Label, Score Explanation)
                              +--> Usage Logs (含 Token 用量與預估費用)

## 3. 核心組件 (Core Components)

### 3.1. Chrome Extension 前端
**技術棧**: React 18 + Vite + Tailwind CSS，直接渲染在 Chrome Popup 或 Options 頁面中。
**職責**:
- **Popup (`App.tsx`)**: 快速選單，提供「履歷解析」與「職缺分析」功能，並顯示即時的 AI 分析結果。
    - **Commute Badge**: 自動根據使用者位置與職缺地點估算通勤時間並分類 (如「你家旁邊」、「舒適距離」等)。
    - **Score Reasoning**: 顯示 AI 給出該契合度分數的具體理由 (2-3 點)。
    - **結果保存**: 可將分析結果「存入 Dashboard」。
- **Options / Dashboard**: 
    - **Dashboard**: 查看已存職缺卡片，管理狀態 (Applied/Rejected)，刪除職缺。
    - **Settings**: 設定使用者個人資料 (Skill, Bio)、API Keys、選擇 AI 模型。
    - **Usage**: 查看 API 使用紀錄與預估費用。

### 3.2. 後端服務 (Background Services)
**服務目錄** (`src/services/`):
- `scraper.ts`: 注入到當前分頁中，用於提取文字內容 (JD 或履歷)。處理特定平台的邏輯 (104, Yourator, LinkedIn)。
- `ai.ts`: 決策者，負責判斷要使用哪一個 AI 提供商 (OpenAI vs Gemini)。
- `openai.ts` / `gemini.ts`: 無狀態 (Stateless) 的 API 客戶端。負責發送 Prompt (含詳細的 Prompt Constraint 與輸出格式要求) 並透過 `utils/pricing.ts` 計算成本後寫入 Log。
- `storage.ts`: `chrome.storage.local` 的包裝器，處理所有持久化資料的存取。

## 4. 資料存儲 (Data Stores)

### 4.1. Chrome Local Storage
**類型**: `chrome.storage.local` (客戶端 NoSQL 鍵值存儲)。
**目的**: 在本地存儲所有使用者資料以確保隱私。完全無後端依賴 (Zero Backend)。
**關鍵 Keys**:
- `user_profile`: `UserProfile` (含 Model config, Keys)。
- `saved_jobs`: `JobEntry[]` (職缺清單，分析結果包含 `AnalysisResult` 結構)。
- `usage_logs`: `UsageLog[]` (API 使用與費用歷史記錄)。

## 5. 外部整合 / API (External Integrations)

### 5.1. OpenAI API
**目的**: 標竿級的職缺分析與履歷解析。
**模型**: `gpt-4o`
**費率**: 參照官方定價 (Input $2.50 / Output $10.00 per 1M)。

### 5.2. Google Gemini API
**目的**: 提供多種性價比選擇與長文本處理能力。
**模型**: 支援多模型切換 (Gemini 3 Pro/Flash, Gemini 2.5, Gemini 2.0)。
**費率**: 根據選擇的模型動態計算 (參考 `src/utils/pricing.ts`)。

## 6. 安全性考量 (Security Considerations)

**資料隱私**:
- **零後端架構 (Zero-Backend)**: 沒有任何資料會傳送到我們自己的伺服器。
- **API Keys**: 僅存儲於 `chrome.storage.local`。
- **費用估算**: 全在客戶端計算，僅供參考。

## 7. 專案識別 (Project Identification)

**專案名稱**: JobRadar AI
**Repository URL**: Local
**主要聯絡人**: Olen
**最後更新日期**: 2025-12-20
