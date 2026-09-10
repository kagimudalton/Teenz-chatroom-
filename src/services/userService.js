import { doc, updateDoc, onSnapshot, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase.js'

// Update online status
export const setOnlineStatus = async (userId, isOnline) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      lastSeen: serverTimestamp(),
    })
  } catch (err) {
    console.warn('setOnlineStatus failed:', err)
  }
}

// Subscribe to a user's online status
export const subscribeToUserStatus = (userId, callback) => {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      const isPrivate = data.showLastSeen === false
      callback({
        isOnline: isPrivate ? false : (data.isOnline || false),
        lastSeen: isPrivate ? null : data.lastSeen,
        isPrivate,
      })
    }
  })
}

// Format last seen time
export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'last seen a while ago'
  const date = lastSeen?.toDate ? lastSeen.toDate() : new Date(lastSeen)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 1000 / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `last seen ${diffMins}m ago`
  if (diffHours < 24) return `last seen ${diffHours}h ago`
  if (diffDays === 1) return 'last seen yesterday'
  return `last seen ${date.toLocaleDateString()}`
}

// Block a user
export const blockUser = async (currentUserId, blockedUserId) => {
  await updateDoc(doc(db, 'users', currentUserId), {
    blockedUsers: arrayUnion(blockedUserId),
  })
}

// Report a user
export const reportUser = async (reporterId, reportedId, reason, messageContext = null) => {
  const { addDoc } = await import('firebase/firestore')
  await addDoc(collection(db, 'reports'), {
    reporterId,
    reportedId,
    reason,
    messageId: messageContext?.messageId || null,
    messageSnapshot: messageContext?.text || null,
    createdAt: serverTimestamp(),
    status: 'pending',
  })
}
