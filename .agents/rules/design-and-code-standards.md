---
trigger: always_on
---

# UI/UX 設計標準與工程代碼規範 (Design & Code Standards)

## 0. 最高架構總綱：單一真理源與全域可複用性 (Single Source of Truth & Maximum Reusability)
- **最高優先級標準 (Supreme Standard)**：
  UI 與 UX 的設計與實現必須最大限度地追求**代碼與視覺的高度可複用性**。全應用程式必須維持「**一處修改，全域變動，始終統一**」的架構紀律。所有後續章節、元件封裝與業務頁面開發，均受本章節之最高約束。
- **三層複用架構 (Three-Tier Reusability Architecture)**：
  - **L1. 視覺與 Design Tokens (Tokens as Single Source of Truth)**：
    - 顏色、字級、行距、邊框粗細、圓角、間距、遮罩等所有視覺屬性，嚴格統一引用全域 Design Tokens（CSS 變數與 Tailwind 語意化類名，如 `bg-background`、`text-foreground`、`border-border` 等）。
    - 任何全局視覺風格調整（如邊框色調、圓角半徑、字距），必須且僅能透過修改底層 Token 設定即時映射至所有畫面，嚴禁各模組私自維護獨立樣式。
  - **L2. 原子元件與基礎控件 (Primitive & Base Components)**：
    - 所有基礎互動控件（按鈕、輸入框、彈窗、選單、下拉框、開關等）統一由 `src/components/ui/`（Shadcn UI / Radix 等）作為唯一真理源進行封裝。
    - 業務層絕對嚴禁繞過共用元件自行以原生 HTML 標籤（如 `<button>`、`<input>`）或自寫重複樣式拼湊控件。
  - **L3. 領域模式與複合元件 (Domain Patterns & Layout Blocks)**：
    - 跨模組或頁面出現 2 次及以上（或預期跨頁面複用）的 UI 結構（例如：列表條目 `UsageListItem`、數據指標卡片 `MetricCard`、數值輸入組合、營養素膠囊標籤等），嚴禁在各業務頁面複製貼上 JSX，必須立即收斂並封裝為共用 Pattern 元件。
- **零容忍重複原則 (Zero Duplication & Single Source of Truth)**：
  - 凡具備共通視覺語意或操作邏輯的區塊，第 1 次實現時即應依據設計系統規範進行抽象封裝。
  - 只要有 2 處或以上出現相同或高度相似的結構與樣式組合，絕對嚴禁複製貼上代碼，必須立即重構為通用元件或共用 Pattern。
- **擴展合約與防污染規範 (Extension Contract & Anti-Corruption)**：
  - **語意化擴展**：共用元件若需支援不同場景、狀態或尺寸，必須透過標準的 Variant（如 `cva` 配置）、Props 參數或 Slot/Children 進行正規擴展。
  - **嚴禁特例覆蓋與 Hack**：絕對嚴禁在業務層透過外部 `!important` 或粗暴傳入破壞性 class 強制覆蓋共用元件核心樣式；絕對嚴禁為了單一頁面的特殊偏好而篡改共用元件的預設行為，造成其他引用頁面非預期跑版。

## 1. 核心視覺風格 (Core Visual Style)
- **Vercel / Next.js 風格**：追求極簡、高對比、具備工程師質感的現代設計。
- **純粹的對比**：嚴格使用純黑 (`#000`) 與純白 (`#fff`) 作為主要背景與文本對比。捨棄傳統的柔和灰色背景。
- **扁平化設計 (Flat Design)**：**絕對禁止**在卡片 (Cards) 或容器上使用任何陰影 (`shadow-sm`, `shadow-md` 等)。層級的區分完全依賴細而精緻的邊框 (`border border-border`)。
- **字體運用 (Typography)**：
  - 數字、重量、次數與統計數據嚴格使用等寬字體 (`font-mono`)，確保對齊與精確感。
  - 大標題使用緊湊的字距 (`tracking-tight`)，小標籤（如 Category, Date, Macros 等提示）使用大寫寬字距 (`uppercase tracking-widest text-xs`)。
  - **中英數排版規則**：所有中文文案（包含 i18n 翻譯檔）都必須嚴格遵循「在中文與英文/數字之間插入一個半形空格」的排版規範（Pangu Spacing），例如「使用 Vite 開發」而不是「使用Vite開發」。

## 2. 佈局與元件標準 (Layout & Components)
- **網格卡片 (Grid Cards)**：數據模組採用獨立的並列卡片設計，無陰影，僅靠邊框與內部留白界定範圍。
- **Usage Dashboard 佈局**：設定頁或表單區塊，採用 Vercel Usage 儀表板的表格式 List 佈局，使用 `divide-y divide-border` 進行行間分隔。
- **嚴禁在列表行中使用多個橫向分段按鈕 (No Multi-Button Segmented Controls in List Items)**：
  - **行動端寬度防擠壓契約**：在表格式列表（Usage List / 表單 `divide-y` 行）中，**絕對嚴禁**在行內右側堆疊多個水平並列的按鈕、膠囊或分段切換器（如 `[ A | B | C ]`）。手機螢幕寬度（360px～390px）不足以容納左側標籤與多個長文字按鈕，會導致嚴重的文字折行、溢出或擠壓。
  - **統一使用 Select 下拉選單**：凡涉及 2 個以上的選項切換（如外觀主題、語言、性別、度量單位、供能比模板等），右側一律採用標準的 `Select` 下拉選單（點擊呼出浮層選單），以「單一選中文字 + 下拉箭頭」的極簡形式呈現，確保在任何行動端尺寸下均維持恆定的單行對齊與極簡質感。
- **毛玻璃效果 (Glassmorphism)**：底部導覽列 (Bottom Nav) 或懸浮標頭使用半透明毛玻璃背景 (`bg-background/80 backdrop-blur-md`)。

## 3. 代碼與型別規範 (Code & TypeScript Standards)
- **架構分層與關注點分離**：
  - 業務邏輯、非同步請求、資料庫查詢與計算必須完整收斂於自定義 Hooks 與 Services 中，UI 元件僅作為純粹的狀態呈現與事件派發器。
  - 嚴禁在 JSX 模板內部撰寫複雜的多行資料推算或非同步副作用。
- **TypeScript 靜態型別約束**：
  - 嚴格啟用靜態型別檢查，**絕對禁止**使用 `any` 型別。所有資料結構、介面、函數回傳值均需明確定義型別。
- **國際化與多語系 (i18n)**：
  - 專案已全面導入 `react-i18next`。新增或修改任何 UI 文字時，**必須**使用 `t('key')` 函數，並同步更新 `src/i18n/locales/` 下的 `en.json`, `zh-TW.json`, `zh-CN.json` 三份語系檔。
  - **絕對禁止**在 Component 程式碼中寫死 (hardcode) 任何中文或英文文案。表單驗證錯誤訊息亦必須透過 i18n 輸出。
  - **嚴禁使用「xx/xx」模糊並列翻譯格式**：所有 UI 文案與 i18n 鍵值，**絕對嚴禁**使用「xx/xx」或「xx / xx」等模糊兼顧的斜線並列格式（如嚴禁「稱呼 / 姓名」、「點心 / 加餐」）。必須提煉出單一精確詞彙（如「姓名」、「加餐」）。
- **精密測量儀測試守則 (Precision Metric Testing & Pure Math Functions)**：
  - 作為客觀測量儀，數學計算結果必須 100% 精準無誤、絕無歧義。
  - 所有核心指標推算（如 e1RM 力量極限估算公式、EMA 體重抗噪平滑算法、宏量營養素供能比計算、能量缺口/盈餘推算等）必須嚴格封裝於 `src/utils/` 下的無副作用純函數（Pure Functions）。
  - 純數學計算函數必須維持 100% 單元測試（Unit Test）覆蓋率，且必須覆蓋所有異常邊界情境（例如次數或重量為 0、負數輸入、除以零防護、小數浮點數精度誤差等）。
- **全局極簡文本契約 (Global Ultra-Concise UI Copy Contract)**：
  - **最高文案哲學：客觀測量儀的極致克制 (Zero Noise, High Signal)**：Zenfit 是一把冷靜、精密、高對比的測量儀，介面中的每一個字元都應具備不可替代的資訊價值。全應用程式（包含按鈕、標籤、表單、標題、空狀態、Toast 通知等所有介面文字）**嚴格執行「文字極簡主義」，嚴禁任何冗長贅字、客套廢話與重複修飾**。
  - **五大極簡提煉法則 (The 5 Rules of Ultra-Concise Copy)**：
    1. **去上下文冗餘（去所屬對象綴詞）**：在已有明確頁面語境的模組中，**絕對嚴禁重複提及當前對象名詞**（嚴禁「新增自定義食物」、「編輯食材」、「已歸檔食物」、「已歸檔動作」、「菜餚列表」；統一使用「新增」、「編輯」、「已歸檔」、「使用中」、「菜餚」）。
    2. **去口語與客套廢話（零修飾、零說教）**：嚴禁「請您…」、「您可以…」、「點擊此處以…」、「溫馨提示…」、「成功完成…」。只陳述客觀事實與動作結果。
    3. **動作動詞純粹化（強動詞、最短字數）**：按鈕與操作統一使用最短有力的動詞（「新增」、「儲存」、「匯出」、「刪除」、「恢復」；英文統一使用 "Add", "Save", "Export", "Delete", "Restore"）。
    4. **通知與 Toast 極限精簡（對象 + 結果）**：彈出通知嚴禁長篇陳述，必須在 2～4 個字內結束（「已儲存」、「已歸檔」、「已刪除」、「已備份」）。
    5. **空狀態客觀陳述（去情緒、零指引說教）**：空狀態僅說明客觀現狀，嚴禁製造焦慮或過度說教（「無食材」、「無已歸檔項目」、「無飲食記錄」）。

## 4. 跨端通用設計契約與交互標準 (Cross-Platform Architecture Contract)
- **拒絕平台特化補丁 (No Platform Hacks)**：嚴禁為特定作業系統、特定瀏覽器或舊款晶片編寫特殊條件判斷或臨時修補；所有 UI 與交互必須以標準 Web 規範達到全平台通用。
- **高度管理規範**：全面採用「樹狀 100% 高度（`height: 100%`）」，禁止在根容器或主佈局使用 `100vh` 避免移動端工具列遮擋溢出。內部滾動由 `<main className="flex-1 overflow-y-auto">` 自適應接管。
- **彈窗與居中規範**：
  - 嚴禁在彈窗本體上使用 `inset-0 m-auto` 或 `transform: translate(-50%, -50%)` 做幾何定位。
  - 所有浮層與 Modal 必須使用外層「全螢幕 Flex 容器居中（`fixed inset-0 flex items-center justify-center p-4 pointer-events-none`）」架構，彈窗本體為普通 block（`pointer-events-auto`），高度嚴格由內容自然撐開。
  - **禁止彈窗巢狀聲明 (No Nested Dialogs in DialogContent / Flat Sibling Portals)**：所有 Dialog / Modal 元件在 JSX 結構中必須以平級兄弟節點（Sibling Node，使用 `<> ... </>` Fragment 平鋪）聲明，**絕對禁止**將次級 `<Dialog>` 寫在另一個 `<DialogContent>` 的 DOM 樹或 JSX 內部。底層 `DialogContent` 必須將 Portal container 預設指定為 `document.body`，實現全域獨立渲染防護。
  - **多層彈窗遮罩棧規範 (Multi-layer Dialog Stacking)**：當主彈窗層級為 `z-[60]` 時，於其上疊加呼出的次級彈窗（Secondary Dialog，如新增食物、選擇動作、二次確認等）其遮罩層與彈窗本體必須指定更高層級（如 `overlayClassName="z-[70]"` 與 `className="z-[70] ..."`），確保第二層彈窗能清晰、高對比地遮蓋在第一層彈窗之上。
  - **焦點管理與禁止自動聚焦 (Dialog Focus & No Auto-Focus)**：彈窗掛載時禁止第 0 幀同步強奪焦點（`initialFocus={false}`）。所有 Dialog 彈窗掛載出現時，**絕對禁止**在任何輸入框上設置 `autoFocus` 屬性或透過 JS 強行 `.focus()`，避免鍵盤自動彈出遮擋彈窗內容。
- **動畫與彈窗彈出規範 (Instant Pop)**：
  - Dialog / Modal 彈窗本體全面採用**「原生級瞬時彈出 (Instant Pop)」**，嚴禁在卡片上附加慢速 `animate-in fade-in` 動畫，徹底避免在舊款設備（如 A9/A10 晶片、iOS 15）上因底層光柵化搶佔時間片導致動畫殘缺與掉幀。
- **毛玻璃與遮罩規範 (Frosted Glassmorphism)**：
  - 遮罩層全面使用專屬語意化變數：`bg-overlay backdrop-blur-[2px] data-closed:hidden`。在淺色模式下呈現純淨白霜牛奶玻璃（`rgba(255, 255, 255, 0.8)`），深色模式下呈現深邃黑曜石毛玻璃（`rgba(0, 0, 0, 0.8)`）。
  - **嚴禁在動態 CSS 變數上直接使用 Tailwind 透明度修飾符（如 `bg-background/80`）**：Tailwind CSS v4 會將帶動態變數的透明度編譯為 CSS `color-mix()` 函式；而 iOS <= 15 的舊版 WebKit 完全不支援 `color-mix()`，會觸發其 Fallback 回退機制變成 100% 完全不透明實色。所有遮罩一律使用 `--color-overlay: var(--overlay)`（內嵌 RGBA Alpha 通道），確保全平台 WebKit 均能原生解析。
  - 遮罩層嚴禁使用 `isolate`，模糊半徑嚴格限制在 `2px`（`backdrop-blur-[2px]`），嚴禁使用動態 Alpha 漸變動畫（`data-closed:hidden`）。
- **彈窗動作按鈕佈局 (Dialog Footer Actions)**：
  - 手機端與全平台 DialogFooter 按鈕嚴格採用**單行水平並排 (`flex flex-row items-center justify-between`)**。
  - **嚴禁在移動端退化為垂直倒序堆疊 (`flex-col-reverse`)**。遵循「**取消在最左側 (Cancel on Left)、確認/新增在最右側 (Confirm/Add on Right)**」，單一按鈕時自動靠右對齊 (`[&>*:only-child]:ml-auto`)。
- **彈窗高度穩定性與防抖規範 (Dialog Height Stability & Anti-Jitter)**：
  - **嚴禁動態插入新元素撐大彈窗容器**：彈窗本體高度必須保持絕對穩定。嚴禁在交互過程中動態在彈窗內部插入或移除額外的文字行或區塊從而導致彈窗高度突增（Layout Shift / Jitter）。
  - **狀態提示規範**：錯誤與警告應優先透過元件本身的視覺狀態切換（如輸入框文字變紅 `text-destructive`、邊框變色、確認按鈕動態禁用 `disabled`）或透過全域 Toast 提示呈現。
- **破壞性動作按鈕規範 (Destructive Buttons)**：
  - 二次確認與破壞性高危操作的 `destructive` 按鈕統一採用「實色紅底 + 純白文字（`bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80`）」，嚴禁使用淡底弱化樣式。
- **頁面內部視圖切換與瀏覽器導航歷史規範 (Page Tab State & History Stack Standards)**：
  - **視圖狀態純本地化 (Tabs as Pure Local State)**：頁面內部的同級視圖、分頁或過濾切換（例如管理清單的「使用中 / 已歸檔」Tab），預設必須使用元件內部純本地狀態（`useState<'active' | 'archived'>`）進行管理，嚴禁濫用 URL Query 參數（如 `?tab=archived`）。
  - **純淨 URL 契約 (Clean Path Contract)**：管理清單與子頁面 URL 必須維持恆定的乾淨純路徑（例如 `/settings/foods`），切換內部 Tab 時不得污染瀏覽器網址列。
  - **瀏覽器返回直達上一層原則 (Deterministic Browser Back Navigation)**：無論使用者在當前頁面的內部 Tab 之間切換多少次，皆不得向瀏覽器歷史堆疊（History Stack）推入新紀錄；使用者點擊瀏覽器「返回」按鈕或頁面返回鍵時，必須確定且直接地返回「上一層頁面」（例如返回「設定」`/settings`），絕對嚴禁退回上一個切換的 Tab。

## 5. 負面清單（絕對禁止與不得 XXX 清單，Strict Prohibitions & "Do Not" List）
為確保代碼簡潔與介面純粹，以下行為在專案中被**絕對禁止**：
1. **不得進行主觀批判與行為干涉**：嚴禁在 UI、文案、Toast 或通知中指示使用者「該吃什麼」、「少吃了」、「超標了」、「該做幾組」或「退步了」；嚴禁設置紅色超標警告卡片或批判性標籤。
2. **不得 Copy-Paste JSX**：嚴禁在不同頁面或組件間複製整段 DOM 結構與 Tailwind 類名串，凡重複 2 次以上必須抽離共用元件。
3. **不得使用 Arbitrary 任意數值與魔術色碼**：嚴禁使用未經 Design Tokens 定義的臨時數值（如 `text-[#1a1a1a]`、`w-[342px]` 等）。
4. **不得在容器或卡片上使用陰影**：絕對禁止 `shadow-sm`、`shadow-md` 等陰影，層級僅靠邊框界定。
5. **不得在列表行右側堆疊多個水平按鈕**：嚴禁多個並列按鈕導致行動端排版折行，多選項切換一律使用 `Select` 下拉選單。
6. **不得在 Component 中 Hardcode 文案**：所有介面文本必須由 `t('key')` 輸出，且嚴禁在翻譯文案中使用「xx/xx」斜線二等詞彙。
7. **不得使用 `any` 型別**：所有 TypeScript 代碼必須具備嚴格且明確的型別定義。
8. **不得在 JSX 內部處理複雜業務計算**：計算與副作用必須收斂於 Hooks 或 Services，UI 只專注於渲染。
9. **不得巢狀聲明 Dialog**：絕對禁止將次級 `<Dialog>` 寫在另一個 `<DialogContent>` 內部，必須作為平級兄弟節點聲明。
10. **不得在彈窗掛載時自動聚焦輸入框**：嚴禁在 Dialog 的輸入框加上 `autoFocus` 或主動 `.focus()`，避免鍵盤自動彈出遮擋彈窗。
11. **不得在動態 CSS 變數上附加 Tailwind 透明度修飾符**：嚴禁如 `bg-background/80`、`bg-destructive/10`，避免舊版 WebKit 不支援 `color-mix()` 導致遮罩變為實色。
12. **不得在彈窗卡片上使用慢速漸入動畫**：彈窗必須瞬時彈出（Instant Pop），徹底避免動畫掉幀。
13. **不得動態插入元素撐大彈窗**：彈窗幾何高度必須恆定，嚴禁因驗證錯誤訊息突增造成視覺跳動抖動。
14. **不得裸奔核心數學計算公式**：嚴禁在缺乏 100% 單元測試覆蓋與邊界測試的情況下，變更或新增 `src/utils/` 中的核心度量公式（如 e1RM、EMA、供能比計算）。
15. **不得執行未備份的毀滅性資料庫操作**：嚴禁在 IndexedDB 升級時跳過版本號管理、未寫 `upgrade` 腳本即變更表結構，或在生產環境執行未經防護的資料庫清空。
16. **不得在單品食物名稱中包含烹調手法與修飾形容詞**：嚴禁「香煎」、「水煮」、「清炒」等前綴，單品食材一律使用客觀原型名詞。
17. **不得在食物名稱或計量單位中使用模糊非客觀量詞**：嚴禁在食物名稱或單位中混入「1 勺」、「1 匙」、「1 碗」、「中顆」等主觀模糊詞，一律回歸克數 (`g`) 與毫升 (`ml`)。
18. **不得將頁面內部 Tab 綁定至污染瀏覽器歷史的 Query 參數**：嚴禁在管理列表切換「使用中 / 已歸檔」等頁面內部視圖時產生 `?tab=archived` 等查詢參數，導致使用者點擊瀏覽器返回時無法直接回到上一層頁面。
19. **不得在全局介面中使用冗長、客套、囉唆或重複上下文的贅贅文案**：全域嚴禁使用帶所屬對象綴詞的冗長詞彙（如嚴禁「已歸檔食物」、「新增菜餚」、「自定義動作列表」）；嚴禁在提示與按鈕中出現「請…」、「您可以…」、「成功完成…」等客套廢話；全局文案必須一律提煉為純粹的狀態詞（如「已歸檔」）、原子動作動詞（如「新增」）與客觀名詞。

## 6. 食物數據與原子計量規範 (Food Data & Atomic Metric Standards)
- **原型食材原子化真理源 (Atomic Ingredients as Ground Truth)**：
  - 單品食材庫僅收錄「原型食材」與具備客觀包裝標籤的「工業食品」。
  - **絕對嚴禁在單品食材名稱中附加烹飪手法前綴**（如嚴禁「香煎雞胸肉」、「水煮蛋」、「烤地瓜」、「香煎鮭魚排」等）。烹調所產生的油脂、糖、鹽等烹飪變量，一律必須作為「菜餚組合 (Recipes)」進行成分解構與引用，不得污染底層原子食材。
- **純粹命名原則 (Pure Naming & Zero Adjectives)**：
  - 名稱必須簡潔、客觀、去修飾、去行銷化（如嚴禁「香煎」、「鮮嫩」、「高纖」、「精選」等形容詞）。
  - 肉品部位直接以生理/分切部位命名（例如使用「牛板腱」而非「瘦牛肉 (板腱)」）。
- **有品牌食材命名標準 (Branded Food Naming Standard)**：
  - 凡具備品牌之工業食品或單品食材，名稱統一呈現與記錄為「`品牌 · 名稱`」（中間使用半形空格與 U+00B7 Middle Dot 間隔點 ` · `，例如「曼可頓 · 全麥吐司」、「Oatly · 燕麥奶」）。
  - 清單副標題或次級資訊嚴格禁止重複堆疊品牌名稱，維持極簡現代純粹感。
- **唯一計量真理源：克數與毫升 (Strict Gram/ml Metric Hierarchy)**：
  - **絕對嚴禁在食物名稱或單位中使用模糊器具與非客觀量詞**（例如嚴禁「1 勺」、「1 匙」、「1 碗」、「1 份」、「中顆」、「掌心大」）。
  - 固體食物一律以「克 (`g`)」、液體一律以「毫升 (`ml`)」為唯一底層物理計量真理源，引導使用者始終以電子秤物理測量，維護客觀測量儀之精確標準。