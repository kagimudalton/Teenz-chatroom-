import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Capture the browser's install prompt event as soon as it fires, so a manual
// "Install app" button anywhere in the UI can trigger it later — the browser
// only fires this once and only if we listen from the very start.
window.deferredInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.deferredInstallPrompt = e
  window.dispatchEvent(new Event('pwa-installable'))
})
window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null
  window.dispatchEvent(new Event('pwa-installed'))
})

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
