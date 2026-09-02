import { collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, arrayUnion } from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadToCloudinary } from './cloudinaryService.js'
import { logEvent } from './analyticsService.js'
import { generateConversationId } from '../utils/helpers.js'

export const getOrCreateConversation = async (uid1, uid2) => {
  const conversationId = generateConversationId(uid1, uid2)
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)
  if (!convSnap.exists()) {
    await setDoc(convRef, { conversationId, participants: [uid1, uid2], createdAt: serverTimestamp(), lastMessage: null, lastMessageAt: serverTimestamp(), unreadCount: { [uid1]: 0, [uid2]: 0 } })
  }
  return conversationId
}

export const sendTextMessage = async (conversationId, senderId, receiverId, text) => {
  if (!text.trim()) throw new Error('Message cannot be empty.')
  if (text.length > 2000) throw new Error('Message too long.')
  return sendMessage(conversationId, { senderId, receiverId, type: 'text', text: text.trim(), mediaURL: null })
}

export const sendMediaMessage = async (conversationId, senderId, receiverId, file, type, onProgress) => {
  const mediaURL = await uploadToCloudinary(file, type, onProgress)
  return sendMessage(conversationId, { senderId, receiverId, type, text: null, mediaURL })
}

const sendMessage = async (conversationId, messageData) => {
  const batch = writeBatch(db)
  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const msgRef = doc(messagesRef)
  const message = { messageId: msgRef.id, conversationId, senderId: messageData.senderId, receiverId: messageData.receiverId, type: messageData.type, text: messageData.text, mediaURL: messageData.mediaURL, status: 'sent', createdAt: serverTimestamp(), deletedFor: [] }
  batch.set(msgRef, message)
  const convRef = doc(db, 'conversations', conversationId)
  batch.update(convRef, { lastMessage: { text: messageData.type === 'text' ? messageData.text : `📎 ${messageData.type}`, type: messageData.type, senderId: messageData.senderId }, lastMessageAt: serverTimestamp() })
  await batch.commit()
  logEvent('message_sent', { type: messageData.type })
  return message
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
  return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }))) }, (err) => { console.warn('Messages listener error:', err) })
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

export const editMessage = async (conversationId, messageId, newText) => {
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
done! 🔥cat
