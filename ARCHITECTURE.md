# 架構概覽 (Architecture Overview)

這份文件是一份關鍵的、動態的模板，旨在讓 Agent 或開發者能快速、全面地理解程式碼庫的架構，以便從第一天起就能高效地導航並進行貢獻。請隨著程式碼庫的演變更新此文件。

## 1. 專案結構 (Project Structure)

本專案是使用 React、Vite 和現代 AI 服務構建的 **Chrome 擴充功能 (Chrome Extension)**。


├── src/
│   ├── assets/              # 靜態資源 (圖片、圖標)
│   ├── components/          # 可重用的 UI 元件 (基於 shadcn/ui)
│   │   └── ui/              # 原子級 UI 元件 (Button, Card, Input)
│   ├── contexts/            # React Context API (JobContext 用於全域狀態管理)
│   ├── options/             # 選項頁面邏輯 (儀表板 Dashboard 與設定 Settings)
│   ├── services/            # 核心業務邏輯與外部服務
│   │   ├── ai.ts            # 統一 AI 服務介面 (負責分派給 OpenAI 或 Gemini)
│   │   ├── gemini.ts        # Google Gemini API 實作
│   │   ├── openai.ts        # OpenAI API 實作
│   │   ├── scraper.ts       # DOM 爬蟲 (用於抓取職缺或履歷內容)
│   │   └── storage.ts       # Chrome Local Storage 的包裝器
│   ├── sidepanel/           # 側邊欄邏輯 (舊版迭代，可能保留或作為備用視圖)
│   ├── types/               # 共用的 TypeScript 介面定義 (UserProfile, JobEntry)
│   ├── App.tsx              # 主要 Popup 邏輯 (選單、職缺分析、履歷解析)
│   ├── main.tsx             # Popup 的進入點
│   └── index.css            # Tailwind CSS 全域樣式
├── dist/                    # 編譯後的生產版本 (Build)
├── public/                  # 複製到根目錄的靜態檔案 (圖標、manifest.json)
├── manifest.json            # Chrome Extension Manifest (V3)
├── vite.config.ts           # Vite 建置設定
└── tailwind.config.js       # Tailwind CSS 設定

## 2. 高層系統圖 (High-Level System Diagram)

[使用者] <--> [Chrome 擴充功能 Popup / SidePanel]
                    |
                    +--> [DOM 爬蟲腳本] <--> [當前瀏覽器分頁 (104, LinkedIn)]
                    |
                    +--> [AI 服務介面 (Facade)]
                    |         |
                    |         +--> [OpenAI API (GPT-4o)]
                    |         |
                    |         +--> [Google Gemini API (Flash 1.5)]
                    |
                    +--> [Chrome Local Storage] (持久化使用者資料與已存職缺)

## 3. 核心組件 (Core Components)

### 3.1. Chrome Extension 前端
**技術棧**: React 18 + Vite + Tailwind CSS，直接渲染在 Chrome Popup 或 Options 頁面中。
**職責**:
- **Popup**: 快速選單，提供「履歷解析」與「職缺分析」功能，並顯示即時的 AI 分析結果。
- **Options Page (選項頁)**: 包含「Dashboard」用於查看已存職缺，以及「Settings」用於設定使用者個人資料。
- **SidePanel (側邊欄)**: (可選) 用於持續追蹤職缺的視圖。

### 3.2. 後端服務 (Background Services)
**服務目錄** (`src/services/`):
- `scraper.ts`: 注入到當前分頁中，用於提取文字內容 (JD 或履歷)。處理特定平台的邏輯 (104, Yourator, LinkedIn)。
- `ai.ts`: 決策者，負責判斷要使用哪一個 AI 提供商 (OpenAI vs Gemini)。
- `openai.ts` / `gemini.ts`: 無狀態 (Stateless) 的 API 客戶端，負責發送 Prompt 給 LLM。
- `storage.ts`: `chrome.storage.local` 的包裝器，處理 `UserProfile` 和 `JobEntry[]` 的非同步讀寫。

## 4. 資料存儲 (Data Stores)

### 4.1. Chrome Local Storage
**類型**: `chrome.storage.local` (客戶端 NoSQL 鍵值存儲)。
**目的**: 在本地存儲所有使用者資料以確保隱私。完全無後端依賴 (Zero Backend)。
**關鍵 Keys**:
- `userProfile`: JSON 物件，包含姓名、技能、API Keys、自傳、經歷。
- `savedJobs`: `JobEntry` 物件陣列 (包含爬取的內容 + AI 分析結果)。

## 5. 外部整合 / API (External Integrations)

### 5.1. OpenAI API
**目的**: 提供高品質甚至是推理能力較強的職缺分析與履歷解析。
**模型**: `gpt-4o`
**驗證**: 使用者提供的 API Key (存儲於本地)。

### 5.2. Google Gemini API
**目的**: 高性價比、速度快且具備大 Context Window 的分析服務。
**模型**: `gemini-1.5-flash` (或使用者指定的 `gemini-3-flash-preview`)
**驗證**: 使用者提供的 API Key (存儲於本地)。

## 6. 部署與基礎設施 (Deployment & Infrastructure)

**平台**: Google Chrome Web Store (或在本地以「未封裝項目」載入)。
**建置系統**: Vite (產出 `dist/` 資料夾)。
**CI/CD**: 目前無 (本地開發)。

## 7. 安全性考量 (Security Considerations)

**資料隱私**:
- **零後端架構 (Zero-Backend)**: 沒有任何資料會傳送到我們自己的伺服器。
- **API Keys**: 僅存儲於 `chrome.storage.local`。僅透過 HTTPS 直接傳送給 OpenAI/Google 伺服器。
- **內容安全策略 (CSP)**: Vite 建置必須符合 Manifest V3 的 CSP 規範 (禁止 unsafe-eval)。

## 8. 開發與測試環境 (Development & Testing)

**本地設置**:
1. `npm install`
2. `npm run dev` (監聽變更)
3. 在 `chrome://extensions` 中載入 `dist/` 資料夾 -> "載入未封裝項目"。

**測試**:
- 透過 Chrome Extension 載入進行手動測試。
- 使用 Background Page / Popup Inspector 進行 `console.log` 除錯。

## 9. 未來考量 / 路線圖 (Future Considerations)

- **同步存儲 (Sync Storage)**: 將關鍵的小型資料 (如設定) 遷移至 `chrome.storage.sync` 以在不同設備間同步。
- **職缺申請追蹤**: 增強 Kanban Board / Dashboard 功能以追蹤投遞狀態。
- **自動填表 (Auto-Fill)**: 利用解析出的履歷資料，自動填寫 104/LinkedIn 上的申請表單。

## 10. 專案識別 (Project Identification)

**專案名稱**: JobRadar AI
**Repository URL**: Local
**主要聯絡人**: User
**最後更新日期**: 2025-12-20
