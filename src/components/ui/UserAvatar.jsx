import { useState } from 'react'
import { getInitials } from '../../utils/helpers.js'

const COLORS = ['#6C4DFF','#00C853','#FF6B6B','#FFD93D','#00E5FF','#FF8C42','#C77DFF','#48CAE4','#F06292','#4CAF50']

const UserAvatar = ({ user, size = 40, showViewer = false }) => {
  const [imgError, setImgError] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  const initials = getInitials(user?.username || user?.displayName || '?')
  const colorIndex = user?.uid ? user.uid.charCodeAt(0) % COLORS.length : 0
  const bgColor = COLORS[colorIndex]
  const hasPhoto = user?.photoURL && !imgError

  const baseStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
    maxHeight: size,
    borderRadius: '50%',
    flexShrink: 0,
    cursor: showViewer && hasPhoto ? 'pointer' : 'default',
    display: 'block',
  }

  const handleClick = (e) => {
    if (showViewer && hasPhoto) {
      e.stopPropagation()
      setViewerOpen(true)
    }
  }

  return (
    <>
      {hasPhoto ? (
        <img
          src={user.photoURL}
          alt={user?.username || 'User'}
          style={{ ...baseStyle, objectFit: 'cover' }}
          referrerPolicy="no-referrer"
          onClick={handleClick}
          onError={() => setImgError(true)}
          loading="eager"
          decoding="sync"
        />
      ) : (
        <div
          style={{
            ...baseStyle,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: size * 0.36,
            userSelect: 'none',
            letterSpacing: '0.02em',
          }}
          onClick={handleClick}
        >
          {initials}
        </div>
      )}

      {viewerOpen && (
        <div
          className="profile-pic-viewer"
          onClick={() => setViewerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            onClick={() => setViewerOpen(false)}
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.2rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          <img
            src={user.photoURL}
            alt={user?.username}
            style={{ width: 280, height: 280, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)' }}
            onClick={e => e.stopPropagation()}
          />
          <p style={{ marginTop: 16, color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{user?.username}</p>
        </div>
      )}
    </>
  )
}

export default UserAvatar
