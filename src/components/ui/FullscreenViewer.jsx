import { useEffect, useRef, useState } from 'react'

const FullscreenViewer = ({ mediaURL, mediaType, onClose }) => {
  const [zoomed, setZoomed] = useState(false)
  const lastTapRef = useRef(0)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleImageTap = (e) => {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double-tap detected
      setZoomed(z => !z)
    }
    lastTapRef.current = now
  }

  return (
    <div className="fullscreen-viewer" onClick={onClose}>
      <button className="fullscreen-close-btn" onClick={onClose}>✕</button>
      {mediaType === 'video' ? (
        <video
          src={mediaURL}
          controls
          autoPlay
          className="fullscreen-media"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={mediaURL}
          alt="Full view"
          className={`fullscreen-media ${zoomed ? 'zoomed' : ''}`}
          onClick={handleImageTap}
          onDoubleClick={(e) => { e.stopPropagation(); setZoomed(z => !z) }}
        />
      )}
      {mediaType !== 'video' && (
        <span className="fullscreen-zoom-hint">Double-tap to {zoomed ? 'zoom out' : 'zoom in'}</span>
      )}
    </div>
  )
}

export default FullscreenViewer
