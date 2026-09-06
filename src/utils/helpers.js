export const generateConversationId = (uid1, uid2) => [uid1, uid2].sort().join('_')

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 1000 / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const formatStoryExpiry = (expiresAt) => {
  if (!expiresAt) return ''
  const expires = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt)
  const diffMs = expires - new Date()
  const diffHours = Math.floor(diffMs / 1000 / 60 / 60)
  const diffMins = Math.floor((diffMs / 1000 / 60) % 60)
  if (diffHours > 0) return `${diffHours}h left`
  if (diffMins > 0) return `${diffMins}m left`
  return 'Expiring soon'
}

export const truncate = (str, maxLength = 40) => {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

export const getInitials = (name = '') => {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username)

// Detects whether a message is made up entirely of emoji (and whitespace),
// used to render it larger with a playful pop-in animation.
const EMOJI_ONLY_PATTERN = /^(\s|\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u
export const isEmojiOnly = (text) => {
  if (!text || text.trim().length === 0) return false
  if (text.trim().length > 12) return false // avoid false positives on long emoji strings
  return EMOJI_ONLY_PATTERN.test(text)
}

export const getStatusIcon = (status) => {
  switch (status) {
    case 'sent': return '✓'
    case 'delivered': return '✓✓'
    case 'read': return '✓✓'
    default: return '○'
  }
}
