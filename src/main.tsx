import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { installIOSInputZoomReset } from '@/lib/ios-input-zoom'
import { applySettings, readSettings } from '@/lib/settings'
import App from './App'
import './index.css'

applySettings(readSettings())
installIOSInputZoomReset()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {import.meta.env.PROD && <Analytics />}
  </StrictMode>,
)
