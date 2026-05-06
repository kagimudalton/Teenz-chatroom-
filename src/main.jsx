import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      
      // Check for updates every 30 seconds
      setInterval(() => reg.update(), 30000)

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — show update prompt
            if (confirm('🔄 New version of Teenz Chatroom available! Update now?')) {
              newWorker.postMessage('skipWaiting')
              window.location.reload()
            }
          }
        })
      })
    } catch (err) {
      console.warn('Service worker registration failed:', err)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
