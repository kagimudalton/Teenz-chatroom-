import { collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadToCloudinary } from './cloudinaryService.js'

export const createGroup = async (creatorId, name, memberIds, photoFile = null) => {
  if (!name.trim()) throw new Error('Group name cannot be empty')
  if (memberIds.length < 1) throw new Error('Add at least one member')

  let photoURL = ''
  if (photoFile) {
    photoURL = await uploadToCloudinary(photoFile, 'image')
  }

  const allMembers = [creatorId, ...memberIds.filter(id => id !== creatorId)]

  const groupRef = await addDoc(collection(db, 'groups'), {
    name: name.trim(),
    photoURL,
    creatorId,
    admins: [creatorId],
    members: allMembers,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    unreadCount: Object.fromEntries(allMembers.map(id => [id, 0])),
  })

  return groupRef.id
}

export const sendGroupMessage = async (groupId, senderId, senderName, text, type = 'text', mediaURL = null, stickerId = null) => {
  const batch = writeBatch(db)
  const msgRef = doc(collection(db, 'groups', groupId, 'messages'))
  
  const message = {
    messageId: msgRef.id,
    groupId,
    senderId,
    senderName,
    type,
    text,
    mediaURL,
    stickerId,
    status: 'sent',
    createdAt: serverTimestamp(),
    deletedFor: [],
    reactions: {},
  }

  batch.set(msgRef, message)
  batch.update(doc(db, 'groups', groupId), {
    lastMessage: { text: type === 'text' ? text : `📎 ${type}`, type, senderId, senderName },
    lastMessageAt: serverTimestamp(),
  })

  await batch.commit()
  return message
}

export const sendGroupMediaMessage = async (groupId, senderId, senderName, file, type) => {
  const mediaURL = await uploadToCloudinary(file, type)
  return sendGroupMessage(groupId, senderId, senderName, `📎 ${type}`, type, mediaURL)
}

export const sendGroupStickerMessage = async (groupId, senderId, senderName, stickerId) => {
  return sendGroupMessage(groupId, senderId, senderName, null, 'sticker', null, stickerId)
}

export const subscribeToGroupMessages = (groupId, callback) => {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })))
  })
}

export const subscribeToGroups = (userId, callback) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id, isGroup: true })))
  })
}

export const leaveGroup = async (groupId, userId) => {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(userId),
    admins: arrayRemove(userId),
  })
}

export const addGroupMember = async (groupId, userId) => {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(userId),
  })
}

export const getGroupInfo = async (groupId) => {
  const snap = await getDoc(doc(db, 'groups', groupId))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}
