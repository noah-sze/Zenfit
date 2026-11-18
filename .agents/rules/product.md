---
trigger: always_on
---

# e2Cal 產品規格與架構白皮書 (Product Spec & Architecture)

## 1. 產品定位與核心使命 (Product Definition & Mission)
- **產品定義**：e2Cal 是一款純客戶端、本地優先（Local-First）且離線完備的「個人飲食、肌力訓練與體態追蹤 PWA 應用程式」。
- **核心使命**：為自律的健身愛好者、自我量化者與重視飲食健康的使用者，提供零延遲、無干擾、極簡高對比的精密記錄儀器。
- **目標體驗**：
  - **極速記錄**：操作路徑無摩擦，每一次輸入與切換皆於毫秒級即時響應。
  - **數據透明與主權**：數據 100% 歸屬使用者，採開放可讀格式且所有數學公式完全公開透明。
  - **無感離線**：安裝 PWA 後軟件必須 100% 離線可用。

## 2. 核心產品哲學與非目標紅線 (Philosophy & Strict Non-Goals)
- **純粹的記錄工具**：軟體不是說教的教練，只負責精密記錄與呈現客觀事實。
- **純粹事實，拒絕批判**：**只呈現客觀數據，不做主觀評判；只計算數學關聯，不給行為指令。**
  - 嚴禁出現「你該吃什麼」、「吃超標了」、「少練了」、「今天退步了」等說教或焦慮性紅色超標警示。
  - 決策權 100% 歸還使用者。
- **開放數據輸出（BYO-AI）**：e2Cal 本身不內建黑盒 AI 教練或付費 LLM 服務，而是透過高結構化的多格式匯出，讓使用者把真實數據一鍵交給自己信任的外部 AI（ChatGPT、Claude、Gemini 等）或真人教練分析。
- **四大明確非目標紅線 (Strict Non-Goals)**：
  1. **零官方後端與帳號系統**：不建置中心化伺服器、不強制登入註冊、不做行為追蹤或專有格式鎖定。
  2. **不做 E2EE 端對端加密與應用內應用鎖**：飲食、訓練與體態記錄屬低敏感度生活數據；盲目導入 E2EE 與 PIN / 生物辨識鎖只會帶來密鑰遺失與永久自鎖的風險。裝置與帳號防護交由作業系統鎖屏及使用者自有雲端帳號負責，確保雲端同步與備份 JSON 隨時開放可讀、永不丟失。
  3. **不做黑盒智能評分與說教建議**：拒絕未經科學驗證的行為打分與主觀評級。
  4. **不做社交社群與打卡懲罰**：不設動態牆、排行榜、心靈雞湯、強制打卡或斷簽懲罰機制。

## 3. 核心功能與領域真理源 (Functional Scope & Domain SSOT)

### 3.1 總覽儀表板與產品導覽 (Dashboard & Landing)
- **雙入口架構**：根路徑 `/` 為獨立產品介紹頁（`LandingPage`，內嵌真實互動式元件 Showcase）；主應用固定運行於 `/app`。
- **總覽首頁 (`Dashboard`)**：單屏彙整當日熱量與三大營養素進度（全站嚴格固定 **碳水、蛋白質、脂肪 / C · P · F** 順序）、肌群恢復狀態熱力圖、今日體重膠囊入口，以及瀏覽器模式下的 PWA 安裝入口。

### 3.2 飲食與營養追蹤 (Nutrition & Macro Tracking)
- **精密基石 + 現實降級（三類條目原型）**：
  - **實體食材與複合食譜 (`item`)**：單品食材分為 5 類（天然食材、工業食品、飲品、食用油、調味品），天然食材嚴格以「未經烹調之生重」為唯一預設物理常數（名稱用純原型名詞，不加「生」字前綴），並透過首次生重確認引導（`RawWeightGuideDialog`）建立認知；複合食譜聚合多項食材與明確烹調用油；支援依營養標籤基準（每份 / 每 100 g / 自訂）無損折算。
  - **外食情境估算 (`estimate`)**：針對無法秤重之外食場景提供情境快速估算（如均衡餐、火鍋、便當等），維持記錄連續性。
  - **按計劃配額 (`as_planned`)**：提供餐別配額佔位，兼顧自律與現實彈性。
- **每日自包含膠囊 SSOT (`DailyDietLog`)**：聚合當日 `meta`（活動係數 PAL 與供能比 C / P / F）與 `entries`（當日進食物理事實引用）。資料庫與備份**嚴禁保留靜態營養素或目標熱量快照**，統一由 Mifflin-St Jeor BMR × PAL 與 4 / 4 / 9 kcal/g 純函數即時動態推算。
- **高頻輔助工具**：跨日複製餐別（`CopyMealDialog`）、單品攝入熱點矩陣（`IntakeFootprintHeatmap`）。

### 3.3 肌力與訓練追蹤 (Strength & Workout Logging)
- **核心資產與流程**：器材庫（`Equipment`）、動作庫（`Exercise`）、課表（`WorkoutRoutine`）、歷史同動作最近組數自動帶入、跨日複製訓練（`CopyWorkoutDialog`）。
- **極簡組數與 SSOT 契約**：僅記錄重量（`weight`）、次數（`reps`）與完成狀態（`isCompleted`）；訓練日誌**嚴禁寫入 `notes` 與動作名稱快照**，動作資訊由動作庫即時關聯解析。
- **力量與容量純數學推算**：採用 Brzycki 公式計算預估 1RM（`e1RM`），並即時統計已完成組總訓練容量（Total Volume）。
- **17 精細解剖肌群與超補償恢復模型**：
  - 每個動作以 3 級機能角色映射至 17 個精細肌群：主動肌（`primary` 1.0）、協同肌（`secondary` 0.6）、穩定肌（`stabilizer` 0.3），搭配男女雙版前後視角解剖熱力圖（`BodyHighlighter`）。
  - 依據客觀生理恢復視窗（大肌群 72 小時 / 3 天、小肌群 48 小時 / 2 天）計算各肌群恢復百分比與 4 階生理狀態（急性期、恢復中、接近就緒、已恢復）。

### 3.4 體態與身體指標 (Weight & Body Metrics)
- **抗噪趨勢與熱力學平衡**：以指數加權移動平均（`EWMA`，`α = 0.15`，等效約 7–10 天窗口）平滑每日水分與胃腸道波動，並推算週體重變化速率與熱力學每日能量差額（`1 kg ≈ 7,700 kcal`）。
- **7 項客觀純數學指標**：平滑體重、BMI、FFMI（去脂體重指數）、去脂體重（LBM）、脂肪總重（Fat Mass）、胸腰倒三角比（V-Taper）與腰臀比（WHR）。
- **圍度追蹤與自訂忽略**：記錄體重、體脂率與全身圍度（肩、胸、腰、臀、手臂、大腿），並允許使用者在設定中獨立忽略「胸腰臀」或「手臂、大腿圍」。

### 3.5 開放數據輸出 (AI Export & Multi-Format Share)
- 支援將單日飲食、訓練、體態或全量數據一鍵匯出為 3 種格式（`aiDataExport.ts` / `aiDataExportImage.ts`）：
  1. **純文字 / Markdown**：高結構化文本，一鍵貼入外部 AI 進行覆盤分析。
  2. **標準 JSON**：無損結構化數據，供進階分析與跨工具串接。
  3. **Canvas 精密長圖**：本地離線繪製高對比單色數據卡，方便留存或分享給教練。

### 3.6 多語系、度量衡與極速操作體驗
- **多語系與極速檢索**：完整支援繁體中文（`zh-TW`）、簡體中文（`zh-CN`）與英文（`en`），食材與動作搜尋支援多語系別名與中文拼音首字母模糊匹配。
- **公制 SI 底層 + 多單位視圖**：資料庫一律以公制 SI（`kg`、`g`、`ml`、`cm`、`kcal`）儲存，視圖層支援公制、英制與自訂組合（體重 `kg / lbs`、食材 `g / oz`、液體 `ml / fl oz`、長度 `cm / in`、熱量 `kcal / kJ`）無損換算。
- **精密交互**：內建自訂精密數字鍵盤（`NumericKeypadDialog`）與 PWA 觸覺回饋（Haptics）。

## 4. 系統、數據與部署架構 (System, Data & Deployment Architecture)

### 4.1 本地優先 IndexedDB 與資料安全防線
- **資料庫引擎**：瀏覽器 IndexedDB 透過 Dexie.js（現行 Schema **v23**）作為唯一資料真理源，核心資料表涵蓋 `user_base_info`、`foods`、`recipes`、`daily_diet_logs`、`equipments`、`exercises`、`routines`、`workout_logs`、`body_metrics`。
- **四重資料安全防線**：
  1. **嚴格版本遞增遷移**：結構變更必須遞增 `.version(n)` 並撰寫 `.upgrade(async tx => ...)` 平滑遷移腳本。
  2. **禁止無防護清庫**：生產環境嚴禁未經高防呆二次確認與備份之刪表或清庫操作。
  3. **持久化儲存授權**：啟動後主動呼叫 `navigator.storage.persist()`，降低系統空間吃緊時遭逐出風險。
  4. **啟動預熱快取**：應用啟動時非阻塞預載食材、食譜與動作記憶體快照，達成選擇彈窗 0ms 秒開。

### 4.2 單一 URL 應用路由架構
- 主應用透過自研單一 URL 適配器（`AppRouter.tsx`）將網址列鎖定於 `/app`，內部視圖與層級歷史 100% 以瀏覽器原生 `window.history.state` 為唯一真理源，完整支援前進 / 後退、手機側滑返回與深層直達回退，且嚴禁以 Query 參數污染網址列。

### 4.3 雲端同步與本地備份統一目錄規範
- **開放可讀目錄樹（Dropbox 同步與 ZIP 備份 100% 同構）**：
  - `manifest.json`、`user/base_info.json`
  - `nutrition/{foods.json, recipes.json, logs/YYYY-MM-DD.json}`
  - `workout/{exercises.json, equipments.json, routines.json, logs/YYYY-MM-DD.json}`
  - `body/metrics/YYYY-MM-DD.json`
- **Dropbox OAuth PKCE 同步**：瀏覽器直連使用者自有 Dropbox，採按日分桶增量同步與「單調遞增邏輯版本號 `rev` + 時間戳」雙重 LWW（Last-Write-Wins）合併演算法。
- **本地全量 ZIP 備份與還原**：以 JSZip 離線匯出 / 匯入完整資料包；本機已有資料時提供衝突策略選擇（覆寫或合併）。

### 4.4 PWA 與雙部署模型
- **離線與安裝體驗**：Workbox 預快取核心靜態資源；啟動第 0 幀捕獲 `beforeinstallprompt`，於瀏覽器首頁提供「安裝」膠囊按鈕（不支援原生 API 時彈出 5 平台傻瓜式教程與 App 內建瀏覽器 `STEP 0` 引導），安裝後自動恢復問候語，設定頁於瀏覽器模式提供顯示 / 隱藏切換。
- **純靜態雙部署支援**：
  - **Cloudflare Pages**：透過 `public/_redirects` 與 `public/_headers` 提供 SPA `/app` 回退、`manifest.webmanifest` 正確 MIME 類型與 `/sw.js` 禁長快取。
  - **自架部署**：內建多階段 `Dockerfile`、`deploy/nginx.conf` 與 `deploy/Caddyfile.example`，支援 Docker / Nginx / Caddy 搭配 HTTPS 一鍵自架。

## 5. 工程架構與品質守門員 (Engineering & Quality Gates)
- **核心技術棧**：React 19、TypeScript 6、Vite 8、Tailwind CSS v4、Base UI / Radix、Dexie 4、Zustand 5、react-i18next、JSZip、Vitest 5、Oxlint。
- **職責分層**：
  - `src/components/`：純 UI 呈現與交互分發，不含複雜資料推算。
  - `src/hooks/`：狀態管理、IndexedDB 查詢與業務操作封裝。
  - `src/services/`：資料庫遷移、Dropbox 同步引擎、ZIP 備份與多格式匯出服務。
  - `src/store/`：輕量全域客戶端狀態（今日日期會話、導航 Tab、介面偏好）。
  - `src/utils/`：無副作用純函數數學公式、單位換算、排序搜尋與平台偵測（維持高單元測試覆蓋率）。
  - `src/types/` 與 `src/constants/`：強型別領域模型與系統常數定義。
- **自動化守門管線**：統一以 `npm run check:all` 串聯 Oxlint、TypeScript 型別檢查、Vitest 單元測試與 Vite 生產建置。

## 6. 未來演進原則 (Roadmap)
- **多端點自有雲端同步擴展**：維持同步層解耦抽象，未來可擴展支援更多使用者自有雲端儲存端點（如 WebDAV、Google Drive、OneDrive），所有端點必須嚴格共用現行「按日分桶可讀 JSON 目錄規範」與 LWW 合併引擎，絕不引入官方託管伺服器或專有資料鎖定。
