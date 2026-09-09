import { collection, doc, addDoc, getDocs, getDoc, setDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadStoryMedia } from './cloudinaryService.js'
import { logEvent } from './analyticsService.js'
import { getContactIds } from './chatService.js'

const STORY_DURATION_MS = 24 * 60 * 60 * 1000

export const postTextStory = async (ownerId, text, background) => {
  if (!text.trim()) throw new Error('Status text cannot be empty.')
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + STORY_DURATION_MS))
  const storyRef = await addDoc(collection(db, 'stories'), { ownerId, mediaURL: null, type: 'text', text: text.trim(), background, caption: '', createdAt: serverTimestamp(), expiresAt, viewerCount: 0 })
  logEvent('story_uploaded', { type: 'text' })
  return { storyId: storyRef.id, expiresAt }
}

export const uploadStory = async (ownerId, file, type, caption = '') => {
  const mediaURL = await uploadStoryMedia(file, type)
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + STORY_DURATION_MS))
  const storyRef = await addDoc(collection(db, 'stories'), { ownerId, mediaURL, type, caption, createdAt: serverTimestamp(), expiresAt, viewerCount: 0 })
  logEvent('story_uploaded', { type })
  return { storyId: storyRef.id, mediaURL, expiresAt }
}

export const recordStoryView = async (storyId, viewerId) => {
  const viewRef = doc(db, 'stories', storyId, 'views', viewerId)
  const existing = await getDoc(viewRef)
  if (!existing.exists()) await setDoc(viewRef, { viewerId, viewedAt: serverTimestamp() })
}

export const getStoryViewers = async (storyId, requestingUserId, ownerId) => {
  if (requestingUserId !== ownerId) throw new Error('Only the story owner can see viewers.')
  const snap = await getDocs(query(collection(db, 'stories', storyId, 'views'), orderBy('viewedAt', 'desc')))
  const viewerIds = snap.docs.map((d) => d.data().viewerId)
  const userDocs = await Promise.all(viewerIds.map((uid) => getDoc(doc(db, 'users', uid))))
  return userDocs.filter((d) => d.exists()).map((d) => d.data())
}

export const subscribeToStories = (viewerId, contactIds, callback) => {
  const now = Timestamp.now()
  const q = query(collection(db, 'stories'), where('expiresAt', '>', now), orderBy('expiresAt', 'asc'))
  return onSnapshot(q, async (snapshot) => {
    const stories = snapshot.docs
      .map((d) => ({ ...d.data(), storyId: d.id }))
      .filter((story) => story.ownerId === viewerId || contactIds.has(story.ownerId))
    const grouped = {}
    for (const story of stories) {
      if (!grouped[story.ownerId]) grouped[story.ownerId] = []
      grouped[story.ownerId].push(story)
    }
    const enriched = await Promise.all(Object.entries(grouped).map(async ([ownerId, ownerStories]) => {
      const userSnap = await getDoc(doc(db, 'users', ownerId))
      return { user: userSnap.exists() ? userSnap.data() : { uid: ownerId, username: 'Unknown' }, stories: ownerStories }
    }))
    callback(enriched)
  })
}
