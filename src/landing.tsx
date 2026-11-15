import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 舊落地頁入口向根路徑 / 瞬時重定向 (0ms Instant Redirect)
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/landing')) {
  window.location.replace('/');
}
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import './i18n/config'
import { ThemeProvider } from './components/ThemeProvider'
import LandingPage from './pages/LandingPage'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="zenance-ui-theme">
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
