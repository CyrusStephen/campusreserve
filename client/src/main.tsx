import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import AppErrorBoundary from './components/AppErrorBoundary'
import LaunchSplash from './components/LaunchSplash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppErrorBoundary><LaunchSplash><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></LaunchSplash></AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
