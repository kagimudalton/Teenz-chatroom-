import { useEffect } from 'react'

const FullscreenViewer = ({ mediaURL, mediaType, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

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
          className="fullscreen-media"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

export default FullscreenViewer
