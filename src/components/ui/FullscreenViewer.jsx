import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

  const content = (
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

  // Rendered via portal directly on document.body — this guarantees it always
  // covers the true viewport, even when triggered from inside an ancestor that
  // has transform/filter/backdrop-filter applied (which would otherwise trap
  // any position:fixed descendant inside that ancestor's box instead of the
  // real screen — the cause of the "tiny image in the corner" bug).
  return createPortal(content, document.body)
}

export default FullscreenViewer
