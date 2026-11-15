import { useTranslation } from 'react-i18next';
import {
  Smartphone,
  Laptop,
  Tablet,
  Cloud,
  Download,
  ArrowDownUp,
  ShieldCheck,
} from 'lucide-react';

/**
 * 簡約直觀的多設備 Dropbox 同步路線圖 (SyncTopologyDiagram)
 * - 數學級百分比對齊的三叉樹狀匯流線（100% 無縫連通，永不脫節）
 * - 上方：本地導出 (ZIP · 資料夾)
 * - 中間：多設備終端 (iPhone · MacBook · iPad)
 * - 路線：多線合併匯流排 ⇄ 雙向增量同步
 * - 底部：個人 Dropbox
 */
export function SyncTopologyDiagram() {
  const { t } = useTranslation();

  return (
    <div className="w-full rounded-lg border border-border bg-card text-card-foreground p-5 sm:p-6 select-none font-mono shadow-none">
      {/* 核心路線圖主體 (縱向流暢連接，居中緊湊) */}
      <div className="flex flex-col items-center w-full max-w-lg mx-auto">
        
        {/* ======================================================== */}
        {/* 上方：本地導出 (直接從本地裝置導出，無需經雲端)              */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 rounded-full border border-border bg-muted/40 text-foreground text-xs font-semibold flex items-center gap-1.5 shadow-none">
            <Download className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            <span>{t('landing.diagram.localExport', '本地導出')}</span>
            <span className="text-[10px] font-normal text-muted-foreground">(ZIP)</span>
          </div>
          {/* 連接線：垂直連向頂部匯流母線 */}
          <div className="w-px h-3 bg-border" />
        </div>

        {/* ======================================================== */}
        {/* 頂部匯流排連線 (從本地導出分支到 3 設備頂部)                 */}
        {/* ======================================================== */}
        <div className="w-full grid grid-cols-3">
          {/* 左欄 (iPhone)：自中心向上轉右 */}
          <div className="relative w-full h-3.5">
            <div className="absolute left-1/2 bottom-0 w-px h-full bg-border -translate-x-1/2" />
            <div className="absolute left-1/2 right-0 top-0 h-px bg-border" />
          </div>
          {/* 中欄 (MacBook)：貫穿橫線 + 中心豎線連通本地導出 */}
          <div className="relative w-full h-3.5">
            <div className="absolute inset-x-0 top-0 h-px bg-border" />
            <div className="absolute left-1/2 inset-y-0 w-px bg-border -translate-x-1/2" />
          </div>
          {/* 右欄 (iPad)：自左橫線轉向中心垂直向下 */}
          <div className="relative w-full h-3.5">
            <div className="absolute left-0 right-1/2 top-0 h-px bg-border" />
            <div className="absolute left-1/2 bottom-0 w-px h-full bg-border -translate-x-1/2" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 節點層 1：多設備終端 (3 等分卡片，內部帶 padding 間隔)      */}
        {/* ======================================================== */}
        <div className="w-full grid grid-cols-3">
          {/* 設備 1：iPhone */}
          <div className="px-1 sm:px-1.5 flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center py-2.5 px-1.5 rounded-lg border border-border bg-muted/20 text-center">
              <Smartphone className="size-4 text-foreground mb-1 stroke-[1.8]" />
              <span className="text-[11px] font-bold text-foreground">iPhone</span>
              <span className="text-[9px] text-muted-foreground">{t('landing.diagram.phone', '手機')}</span>
            </div>
          </div>

          {/* 設備 2：MacBook */}
          <div className="px-1 sm:px-1.5 flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center py-2.5 px-1.5 rounded-lg border border-border bg-muted/20 text-center">
              <Laptop className="size-4 text-foreground mb-1 stroke-[1.8]" />
              <span className="text-[11px] font-bold text-foreground">MacBook</span>
              <span className="text-[9px] text-muted-foreground">{t('landing.diagram.desktop', '桌面')}</span>
            </div>
          </div>

          {/* 設備 3：iPad */}
          <div className="px-1 sm:px-1.5 flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center py-2.5 px-1.5 rounded-lg border border-border bg-muted/20 text-center">
              <Tablet className="size-4 text-foreground mb-1 stroke-[1.8]" />
              <span className="text-[11px] font-bold text-foreground">iPad</span>
              <span className="text-[9px] text-muted-foreground">{t('landing.diagram.tablet', '平板')}</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 底部匯流排連線 (從 3 設備底部匯流至中央中線)                 */}
        {/* ======================================================== */}
        <div className="w-full grid grid-cols-3">
          {/* 左欄 (iPhone)：自中心向下轉右 */}
          <div className="relative w-full h-3.5">
            <div className="absolute left-1/2 top-0 w-px h-full bg-border -translate-x-1/2" />
            <div className="absolute left-1/2 right-0 bottom-0 h-px bg-border" />
          </div>
          {/* 中欄 (MacBook)：貫穿底線 + 中心豎線向下引出 */}
          <div className="relative w-full h-3.5">
            <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
            <div className="absolute left-1/2 inset-y-0 w-px bg-border -translate-x-1/2" />
          </div>
          {/* 右欄 (iPad)：自中心向下轉左 */}
          <div className="relative w-full h-3.5">
            <div className="absolute left-1/2 top-0 w-px h-full bg-border -translate-x-1/2" />
            <div className="absolute left-0 right-1/2 bottom-0 h-px bg-border" />
          </div>
        </div>

        {/* 匯流後中央垂直主線 */}
        <div className="w-px h-3 bg-border" />

        {/* 雙向增量同步標籤膠囊 */}
        <div className="px-2.5 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground flex items-center gap-1.5 shadow-none my-0.5">
          <ArrowDownUp className="size-2.5 text-sky-500" />
          <span>{t('landing.diagram.bidirectionalSync', '雙向增量同步')}</span>
        </div>

        {/* 垂直引線連入 Dropbox */}
        <div className="w-px h-3 bg-border" />

        {/* ======================================================== */}
        {/* 節點層 2：個人 Dropbox (極簡節點)                         */}
        {/* ======================================================== */}
        <div className="w-full max-w-xs rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold text-xs">
            <Cloud className="size-4 stroke-[2]" />
            <span>{t('landing.diagram.personalDropbox', '個人 Dropbox')}</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {t('landing.diagram.oauthPkce', 'OAuth 2.0 PKCE 直連')}
          </div>
        </div>

      </div>

      {/* 底部數據主權極簡承諾 */}
      <div className="border-t border-border mt-5 sm:mt-6 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-emerald-500" />
          <span>{t('landing.diagram.dataSovereignty', '數據 100% 本地所有 · 隨時自由遷移')}</span>
        </div>
        <span className="uppercase tracking-wider hidden sm:inline">ZERO VENDOR LOCK-IN</span>
      </div>

    </div>
  );
}
