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
 * - 內嵌 h-10 灰底表頭與點陣背景畫布，與全站 SectionCard 視覺語言一致
 * - 數學級百分比對齊的三叉樹狀匯流線（100% 無縫連通，永不脫節）
 * - 上方：本地導出 (ZIP) · 中間：多設備終端 · 底部：個人 Dropbox (OAuth 2.0 PKCE)
 */
export function SyncTopologyDiagram() {
  const { t } = useTranslation();

  return (
    <div className="w-full rounded-lg border border-border bg-card text-card-foreground select-none font-mono shadow-none overflow-hidden">
      {/* 核心路線圖畫布 (微點陣底紋，縱向流暢連接) */}
      <div
        className="px-4 py-6 sm:px-6 sm:py-8"
        style={{
          backgroundImage: 'radial-gradient(var(--canvas-dot) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <div className="flex flex-col items-center w-full max-w-lg mx-auto">
          {/* 上方：本地導出 */}
          <div className="flex flex-col items-center">
            <div className="px-3 py-1 rounded-full border border-border bg-card text-foreground text-xs font-semibold flex items-center gap-1.5 shadow-none">
              <Download className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
              <span>{t('landing.diagram.localExport', '本地導出')}</span>
              <span className="text-2xs font-normal text-muted-foreground">(ZIP)</span>
            </div>
            <div className="w-px h-4 bg-border" />
          </div>

          {/* 頂部匯流排連線 */}
          <div className="w-full grid grid-cols-3">
            <div className="relative w-full h-4">
              <div className="absolute left-1/2 bottom-0 w-px h-full bg-border -translate-x-1/2" />
              <div className="absolute left-1/2 right-0 top-0 h-px bg-border" />
            </div>
            <div className="relative w-full h-4">
              <div className="absolute inset-x-0 top-0 h-px bg-border" />
              <div className="absolute left-1/2 inset-y-0 w-px bg-border -translate-x-1/2" />
            </div>
            <div className="relative w-full h-4">
              <div className="absolute left-0 right-1/2 top-0 h-px bg-border" />
              <div className="absolute left-1/2 bottom-0 w-px h-full bg-border -translate-x-1/2" />
            </div>
          </div>

          {/* 節點層 1：多設備終端 */}
          <div className="w-full grid grid-cols-3">
            <div className="px-1 sm:px-2 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg border border-border bg-card text-center">
                <Smartphone className="size-4 text-foreground mb-1 stroke-[1.8]" />
                <span className="text-xs font-semibold text-foreground">iPhone</span>
                <span className="text-2xs font-sans text-muted-foreground">{t('landing.diagram.phone', '手機')}</span>
              </div>
            </div>

            <div className="px-1 sm:px-2 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg border border-border bg-card text-center">
                <Laptop className="size-4 text-foreground mb-1 stroke-[1.8]" />
                <span className="text-xs font-semibold text-foreground">MacBook</span>
                <span className="text-2xs font-sans text-muted-foreground">{t('landing.diagram.desktop', '桌面')}</span>
              </div>
            </div>

            <div className="px-1 sm:px-2 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg border border-border bg-card text-center">
                <Tablet className="size-4 text-foreground mb-1 stroke-[1.8]" />
                <span className="text-xs font-semibold text-foreground">iPad</span>
                <span className="text-2xs font-sans text-muted-foreground">{t('landing.diagram.tablet', '平板')}</span>
              </div>
            </div>
          </div>

          {/* 底部匯流排連線 */}
          <div className="w-full grid grid-cols-3">
            <div className="relative w-full h-4">
              <div className="absolute left-1/2 top-0 w-px h-full bg-border -translate-x-1/2" />
              <div className="absolute left-1/2 right-0 bottom-0 h-px bg-border" />
            </div>
            <div className="relative w-full h-4">
              <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
              <div className="absolute left-1/2 inset-y-0 w-px bg-border -translate-x-1/2" />
            </div>
            <div className="relative w-full h-4">
              <div className="absolute left-1/2 top-0 w-px h-full bg-border -translate-x-1/2" />
              <div className="absolute left-0 right-1/2 bottom-0 h-px bg-border" />
            </div>
          </div>

          {/* 匯流後中央垂直主線 */}
          <div className="w-px h-4 bg-border" />

          {/* 雙向增量同步標籤膠囊 */}
          <div className="px-3 py-1 rounded-full border border-border bg-card text-2xs text-muted-foreground flex items-center gap-1.5 shadow-none my-0.5">
            <ArrowDownUp className="size-2.5 text-sky-500" />
            <span>{t('landing.diagram.bidirectionalSync', '雙向增量同步')}</span>
          </div>

          {/* 垂直引線連入 Dropbox */}
          <div className="w-px h-4 bg-border" />

          {/* 節點層 2：個人 Dropbox */}
          <div className="w-full max-w-xs rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold text-xs">
              <Cloud className="size-4 stroke-[2]" />
              <span>{t('landing.diagram.personalDropbox', '個人 Dropbox')}</span>
            </div>
            <div className="text-2xs font-mono text-muted-foreground">
              {t('landing.diagram.oauthPkce', 'OAuth 2.0 PKCE 直連')}
            </div>
          </div>
        </div>
      </div>

      {/* 底部數據主權極簡承諾條 */}
      <div className="h-9 px-4 border-t border-border bg-muted/40 flex items-center justify-between text-2xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
          <span className="truncate">{t('landing.diagram.dataSovereignty', '數據 100% 本地所有 · 隨時自由遷移')}</span>
        </div>
        <span className="uppercase tracking-wider hidden sm:inline shrink-0">ZERO VENDOR LOCK-IN</span>
      </div>
    </div>
  );
}
