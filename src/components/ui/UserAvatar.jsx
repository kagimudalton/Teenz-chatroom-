import { getInitials } from '../../utils/helpers.js'

const UserAvatar = ({ user, size = 40 }) => {
  const initials = getInitials(user?.username || user?.displayName || '')
  const colors = ['#6C4DFF','#00E5FF','#FF6B6B','#FFD93D','#6BCB77','#FF8C42','#C77DFF','#48CAE4']
  const colorIndex = user?.uid ? user.uid.charCodeAt(0) % colors.length : 0
  const bgColor = colors[colorIndex]
  const style = { width: size, height: size, borderRadius: '50%', fontSize: size * 0.38, flexShrink: 0 }

  if (user?.photoURL) {
    return <img src={user.photoURL} alt={user.username || 'User'} style={{ ...style, objectFit: 'cover', display: 'block' }} referrerPolicy="no-referrer" />
  }

  return (
    <div style={{ ...style, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, userSelect: 'none' }}>
      {initials}
    </div>
  )
}

export default UserAvatar
