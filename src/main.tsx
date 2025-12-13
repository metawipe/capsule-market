import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initTelegramMiniApp } from './twa'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

initTelegramMiniApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/metawipe/capsule-market/refs/heads/main/manifest.json">
    <App />
    </TonConnectUIProvider>
  </StrictMode>,
)