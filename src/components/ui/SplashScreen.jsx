import { useEffect, useState } from 'react'

const SplashScreen = () => {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setTimeout(() => setAnimate(true), 100)
  }, [])

  return (
    <div className={`splash-screen ${animate ? 'animate' : ''}`}>
      <div className="splash-bg" />
      <div className="splash-overlay" />
      <div className="splash-content">
        <div className="splash-logo">
          <span className="splash-word-teenz">Teenz</span>
          <span className="splash-word-chat">Chatroom</span>
        </div>
        <div className="splash-tagline">Chat. Connect. Vibe. 🔥</div>
        <div className="splash-loader">
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
