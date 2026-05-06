import { useState } from 'react'
import { getInitials } from '../../utils/helpers.js'

const UserAvatar = ({ user, size = 40, showViewer = false }) => {
  const [viewerOpen, setViewerOpen] = useState(false)
  const initials = getInitials(user?.username || user?.displayName || '')
  const colors = ['#6C4DFF','#00E5FF','#FF6B6B','#FFD93D','#6BCB77','#FF8C42','#C77DFF','#48CAE4']
  const colorIndex = user?.uid ? user.uid.charCodeAt(0) % colors.length : 0
  const bgColor = colors[colorIndex]

  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    fontSize: size * 0.38,
    flexShrink: 0,
    cursor: showViewer && user?.photoURL ? 'pointer' : 'default',
  }

  const handleClick = (e) => {
    if (showViewer && user?.photoURL) {
      e.stopPropagation()
      setViewerOpen(true)
    }
  }

  return (
    <>
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.username || 'User'}
          style={{
            ...style,
            objectFit: 'cover',
            display: 'block',
            border: size > 40 ? '2px solid rgba(255,255,255,0.15)' : 'none',
          }}
          referrerPolicy="no-referrer"
          onClick={handleClick}
          loading="eager"
        />
      ) : (
        <div
          style={{
            ...style,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            userSelect: 'none',
          }}
          onClick={handleClick}
        >
          {initials}
        </div>
      )}

      {/* Full screen profile pic viewer */}
      {viewerOpen && (
        <div className="profile-pic-viewer" onClick={() => setViewerOpen(false)}>
          <button className="profile-pic-viewer-close" onClick={() => setViewerOpen(false)}>✕</button>
          <img
            src={user.photoURL}
            alt={user.username}
            onClick={e => e.stopPropagation()}
          />
          <div className="profile-pic-viewer-name">{user.username}</div>
        </div>
      )}
    </>
  )
}

export default UserAvatar
