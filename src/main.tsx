import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import './i18n/config'
import App from './App.tsx'

import { ThemeProvider } from './components/ThemeProvider'
import { requestStoragePersistence } from '@/services/storage/storageManager'
import { prewarmFoodsCache } from '@/hooks/useFoods'
import { prewarmRecipesCache } from '@/hooks/useRecipes'
import { prewarmExercisesCache } from '@/hooks/useExercises'

// 在生產環境自動註冊 PWA Service Worker 實現 100% 離線可用；
// 在本機開發環境 (npm run dev) 主動清理並註銷殘留的 Service Worker，避免 HMR/ESM 請求被攔截導致死鎖
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
} else {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.log('Zenfit is 100% ready to work offline.');
    },
  });
}

// 主動向瀏覽器申請持久化儲存授權，防止 Safari / Chrome 閒置清理 IndexedDB
setTimeout(() => {
  requestStoragePersistence().catch(() => {});
}, 1500);

// 記憶體注水預熱：應用啟動後非阻塞預載入核心領域實體快照，達成全站選擇彈窗 0ms 即時秒開
if (typeof window !== 'undefined') {
  setTimeout(() => {
    prewarmFoodsCache().catch(() => {});
    prewarmRecipesCache().catch(() => {});
    prewarmExercisesCache().catch(() => {});
  }, 100);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="zenfit-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
);

// 平滑關閉 PWA 首屏看門狗
if (typeof (window as any).__dismissAppShell === 'function') {
  (window as any).__dismissAppShell();
}

// 修復 iOS Safari/PWA 虛擬鍵盤或輸入框聚焦引發的 visualViewport 殘留偏移導致點擊錯位
if (typeof window !== 'undefined') {
  document.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    }
  });
}
