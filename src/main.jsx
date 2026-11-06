import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted fonts: they work offline in the installed app (Google Fonts did not).
// Inter for Latin letters and digits, IBM Plex Sans Arabic for Arabic (only the Arabic subset).
import '@fontsource-variable/inter/wght.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './lib/pwa'

document.documentElement.dir = 'rtl'
document.documentElement.lang = 'ar'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

registerServiceWorker()
