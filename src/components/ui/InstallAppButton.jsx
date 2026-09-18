import { useState, useEffect } from 'react'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isAndroid = () => /android/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const InstallAppButton = ({ variant = 'compact' }) => {
  const [canInstall, setCanInstall] = useState(!!window.deferredInstallPrompt)
  const [installed, setInstalled] = useState(isStandalone())
  const [showHelp, setShowHelp] = useState(false)

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

  if (installed) {
    return variant === 'settings' ? (
      <p className="install-app-status">✅ Already installed on this device</p>
    ) : null
  }

  const handleClick = async () => {
    if (canInstall) {
      const promptEvent = window.deferredInstallPrompt
      if (promptEvent) {
        promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        if (outcome === 'accepted') {
          window.deferredInstallPrompt = null
          setCanInstall(false)
        }
        return
      }
    }
    // No native prompt available yet (common on Android before Chrome's own
    // eligibility heuristics kick in, and always the case on iOS) — show
    // manual steps instead of doing nothing.
    setShowHelp(true)
  }

  return (
    <>
      <button className={`install-app-btn ${variant === 'settings' ? 'install-app-btn-settings' : ''}`} onClick={handleClick} title="Install app">
        📲 Install app
      </button>

      {showHelp && (
        <div className="lock-screen" onClick={() => setShowHelp(false)}>
          <div className="lock-screen-card" onClick={e => e.stopPropagation()}>
            <div className="lock-screen-icon">📲</div>
            <h2>Install Teenz Chatroom</h2>
            {isIOS() ? (
              <>
                <p>iPhone/iPad don't let apps trigger this automatically — just do it manually:</p>
                <ol className="ios-install-steps">
                  <li>Tap the <strong>Share</strong> icon (square with an arrow) in Safari's toolbar</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </>
            ) : isAndroid() ? (
              <>
                <p>Your browser hasn't offered the automatic install prompt yet — add it manually instead:</p>
                <ol className="ios-install-steps">
                  <li>Tap the <strong>⋮</strong> menu in the top-right of Chrome</li>
                  <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>)</li>
                  <li>Confirm by tapping <strong>Install</strong></li>
                </ol>
              </>
            ) : (
              <p>Look for an install icon in your browser's address bar, or check its menu for "Install app."</p>
            )}
            <button className="lock-unlock-btn" onClick={() => setShowHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallAppButton
