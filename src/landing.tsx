import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
