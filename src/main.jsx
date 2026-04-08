import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/toast/ToastProvider.jsx'
import { ThemePresetProvider } from './theme/ThemePresetProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemePresetProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemePresetProvider>
  </StrictMode>,
)
