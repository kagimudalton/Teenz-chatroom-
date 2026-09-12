import { useState, useEffect } from 'react'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const InstallAppButton = () => {
  const [canInstall, setCanInstall] = useState(!!window.deferredInstallPrompt)
  const [installed, setInstalled] = useState(isStandalone())
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  useEffect(() => {
    const onInstallable = () => setCanInstall(true)
    const onInstalled = () => { setInstalled(true); setCanInstall(false) }
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  if (installed) return null
  // On iOS there's no install event at all — always offer the manual instructions
  // instead, since that's the only way to add to the home screen there.
  if (!canInstall && !isIOS()) return null

  const handleClick = async () => {
    if (isIOS()) {
      setShowIOSHelp(true)
      return
    }
    const promptEvent = window.deferredInstallPrompt
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      window.deferredInstallPrompt = null
      setCanInstall(false)
    }
  }

  return (
    <>
      <button className="install-app-btn" onClick={handleClick} title="Install app">
        📲 Install app
      </button>

      {showIOSHelp && (
        <div className="lock-screen" onClick={() => setShowIOSHelp(false)}>
          <div className="lock-screen-card" onClick={e => e.stopPropagation()}>
            <div className="lock-screen-icon">📲</div>
            <h2>Install Teenz Chatroom</h2>
            <p>
              iPhone/iPad don't let apps trigger this automatically — just do it manually:
            </p>
            <ol className="ios-install-steps">
              <li>Tap the <strong>Share</strong> icon (square with an arrow) in Safari's toolbar</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top right</li>
            </ol>
            <button className="lock-unlock-btn" onClick={() => setShowIOSHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallAppButton
