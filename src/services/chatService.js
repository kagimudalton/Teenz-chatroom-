import { collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, arrayUnion, arrayRemove, increment } from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadToCloudinary } from './cloudinaryService.js'
import { logEvent } from './analyticsService.js'
import { generateConversationId } from '../utils/helpers.js'

export const getContactIds = async (userId) => {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId))
  const snap = await getDocs(q)
  const contactIds = new Set()
  snap.docs.forEach((d) => {
    const participants = d.data().participants || []
    participants.forEach((p) => { if (p !== userId) contactIds.add(p) })
  })
  return contactIds
}

export const logCallMessage = async (conversationId, callerId, receiverId, callType, callStatus, durationSeconds = null) => {
  const statusText = {
    completed: 'Call ended',
    missed: 'Missed call',
    declined: 'Call declined',
    cancelled: 'Call cancelled',
  }[callStatus] || 'Call ended'

  const text = durationSeconds
    ? `${statusText} • ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
    : statusText

  return sendMessage(conversationId, {
    senderId: callerId,
    receiverId,
    type: 'call',
    text,
    mediaURL: null,
    callType,
    callStatus,
  })
}

export const archiveConversation = async (conversationId, userId) => {
  await updateDoc(doc(db, 'conversations', conversationId), { archivedFor: arrayUnion(userId) })
}

export const unarchiveConversation = async (conversationId, userId) => {
  await updateDoc(doc(db, 'conversations', conversationId), { archivedFor: arrayRemove(userId) })
}

export const setDisappearingDuration = async (conversationId, durationMs) => {
  await updateDoc(doc(db, 'conversations', conversationId), { disappearingDuration: durationMs })
}

export const getOrCreateConversation = async (uid1, uid2) => {
  const conversationId = generateConversationId(uid1, uid2)
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)
  if (!convSnap.exists()) {
    await setDoc(convRef, { conversationId, participants: [uid1, uid2], createdAt: serverTimestamp(), lastMessage: null, lastMessageAt: serverTimestamp(), unreadCount: { [uid1]: 0, [uid2]: 0 } })
  }
  return conversationId
}

export const sendTextMessage = async (conversationId, senderId, receiverId, text, replyingTo = null, disappearingDuration = null) => {
  if (!text.trim()) throw new Error('Message cannot be empty.')
  if (text.length > 2000) throw new Error('Message too long.')
  return sendMessage(conversationId, { senderId, receiverId, type: 'text', text: text.trim(), mediaURL: null, replyTo: buildReplyTo(replyingTo), disappearingDuration })
}

export const sendMediaMessage = async (conversationId, senderId, receiverId, file, type, onProgress, replyingTo = null, disappearingDuration = null) => {
  const mediaURL = await uploadToCloudinary(file, type, onProgress)
  return sendMessage(conversationId, { senderId, receiverId, type, text: null, mediaURL, replyTo: buildReplyTo(replyingTo), disappearingDuration })
}

export const sendStickerMessage = async (conversationId, senderId, receiverId, stickerId, disappearingDuration = null) => {
  return sendMessage(conversationId, { senderId, receiverId, type: 'sticker', text: null, mediaURL: null, stickerId, disappearingDuration })
}

const buildReplyTo = (originalMsg) => {
  if (!originalMsg) return null
  return {
    messageId: originalMsg.messageId || originalMsg.id || null,
    senderId: originalMsg.senderId || null,
    type: originalMsg.type || 'text',
    text: originalMsg.type === 'text' ? (originalMsg.text || '') : null,
  }
}

const sendMessage = async (conversationId, messageData) => {
  const batch = writeBatch(db)
  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const msgRef = doc(messagesRef)
  const expiresAt = messageData.disappearingDuration ? Date.now() + messageData.disappearingDuration : null
  const message = { messageId: msgRef.id, conversationId, senderId: messageData.senderId, receiverId: messageData.receiverId, type: messageData.type, text: messageData.text, mediaURL: messageData.mediaURL, stickerId: messageData.stickerId || null, callType: messageData.callType || null, callStatus: messageData.callStatus || null, replyTo: messageData.replyTo || null, status: 'sent', createdAt: serverTimestamp(), expiresAt, deletedFor: [] }
  batch.set(msgRef, message)
  const convRef = doc(db, 'conversations', conversationId)
  batch.update(convRef, { lastMessage: { text: messageData.type === 'text' ? messageData.text : `📎 ${messageData.type}`, type: messageData.type, senderId: messageData.senderId }, lastMessageAt: serverTimestamp(), [`unreadCount.${messageData.receiverId}`]: increment(1) })
  await batch.commit()
  logEvent('message_sent', { type: messageData.type })
  return message
}

export const markMessagesAsDelivered = async (conversationId, currentUserId) => {
  try {
    const q = query(collection(db, 'conversations', conversationId, 'messages'), where('receiverId', '==', currentUserId), where('status', '==', 'sent'))
    const snap = await getDocs(q)
    if (snap.empty) return
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.update(d.ref, { status: 'delivered' }))
    await batch.commit()
  } catch (err) {
    console.warn('markMessagesAsDelivered failed:', err)
  }
}

export const markMessagesAsRead = async (conversationId, currentUserId) => {
  try {
    const q = query(collection(db, 'conversations', conversationId, 'messages'), where('receiverId', '==', currentUserId), where('status', '!=', 'read'))
    const snap = await getDocs(q)
    if (snap.empty) return
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.update(d.ref, { status: 'read' }))
    batch.update(doc(db, 'conversations', conversationId), { [`unreadCount.${currentUserId}`]: 0 })
    await batch.commit()
  } catch (err) {
    console.warn('markMessagesAsRead failed:', err)
  }
}

export const subscribeToMessages = (conversationId, callback, messageLimit = 50) => {
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'), limit(messageLimit))
  return onSnapshot(q, (snapshot) => {
    const now = Date.now()
    const messages = snapshot.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .filter((msg) => !msg.expiresAt || msg.expiresAt > now)
    callback(messages)
  }, (err) => { console.warn('Messages listener error:', err) })
}

export const subscribeToConversations = (userId, callback) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  )
  return onSnapshot(q, async (snapshot) => {
    try {
      const conversations = await Promise.all(
        snapshot.docs.map(async (d) => {
          const conv = d.data()
          const otherUserId = conv.participants.find((p) => p !== userId)
          if (!otherUserId) return null
          try {
            const otherUserSnap = await getDoc(doc(db, 'users', otherUserId))
            return { ...conv, id: d.id, otherUser: otherUserSnap.exists() ? otherUserSnap.data() : { uid: otherUserId, username: 'Unknown' } }
          } catch {
            return { ...conv, id: d.id, otherUser: { uid: otherUserId, username: 'Unknown' } }
          }
        })
      )
      callback(conversations.filter(Boolean))
    } catch (err) {
      console.warn('Conversations listener error:', err)
      callback([])
    }
  }, (err) => {
    console.warn('Conversations snapshot error:', err)
    callback([])
  })
}

export const searchUsers = async (searchTerm, currentUserId) => {
  if (!searchTerm || searchTerm.length < 2) return []
  const q = query(collection(db, 'users'), where('username', '>=', searchTerm), where('username', '<=', searchTerm + '\uf8ff'), limit(10))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data()).filter((u) => u.uid !== currentUserId)
}

export const deleteMessageForUser = async (conversationId, messageId, userId) => {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), { deletedFor: arrayUnion(userId) })
}

export const EDIT_WINDOW_MS = 15 * 60 * 1000

export const editMessage = async (conversationId, messageId, newText, createdAt = null) => {
  if (createdAt) {
    const sentTime = createdAt?.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime()
    if (Date.now() - sentTime > EDIT_WINDOW_MS) {
      throw new Error('This message is too old to edit (15 minute limit).')
    }
  }
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId)
  await updateDoc(msgRef, { text: newText, edited: true, editedAt: serverTimestamp() })
}

export const addReaction = async (conversationId, messageId, userId, emoji) => {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId)
  const snap = await getDoc(msgRef)
  if (!snap.exists()) return
  const reactions = snap.data().reactions || {}
  const emojiReactions = reactions[emoji] || []
  let updated
  if (emojiReactions.includes(userId)) {
    updated = { ...reactions, [emoji]: emojiReactions.filter(id => id !== userId) }
  } else {
    updated = { ...reactions, [emoji]: [...emojiReactions, userId] }
  }
  Object.keys(updated).forEach(k => { if (updated[k].length === 0) delete updated[k] })
  await updateDoc(msgRef, { reactions: updated })
}

export const forwardMessage = async (conversationId, senderId, receiverId, originalMsg) => {
  const text = originalMsg.type === 'text' ? originalMsg.text : null
  const mediaURL = originalMsg.mediaURL || null
  return sendMessage(conversationId, {
    senderId,
    receiverId,
    type: originalMsg.type,
    text,
    mediaURL,
    forwarded: true,
  })
}

export const setTypingStatus = async (conversationId, userId, isTyping) => {
  const convRef = doc(db, 'conversations', conversationId)
  await updateDoc(convRef, {
    [`typing.${userId}`]: isTyping,
  })
}

export const subscribeToTyping = (conversationId, callback) => {
  return onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
    if (snap.exists()) {
      callback(snap.data().typing || {})
    }
  })
}
