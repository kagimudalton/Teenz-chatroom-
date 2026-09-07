import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from './firebase.js'

// Hashes a PIN with SHA-256 via the browser's Web Crypto API. The hash is
// stored in Firestore (never the raw PIN), so it syncs across the user's
// devices while the actual code stays unreadable in the database.
const hashPin = async (pin) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const setAppLockPin = async (uid, pin) => {
  const pinHash = await hashPin(pin)
  await updateDoc(doc(db, 'users', uid), { 'security.pinHash': pinHash, 'security.appLockEnabled': true })
}

export const disableAppLock = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { 'security.pinHash': null, 'security.appLockEnabled': false, 'security.lockedChatIds': [] })
}

export const setAppLockEnabled = async (uid, enabled) => {
  await updateDoc(doc(db, 'users', uid), { 'security.appLockEnabled': enabled })
}

export const verifyPin = async (pin, storedHash) => {
  if (!storedHash) return false
  const enteredHash = await hashPin(pin)
  return enteredHash === storedHash
}

export const lockChat = async (uid, chatId) => {
  await updateDoc(doc(db, 'users', uid), { 'security.lockedChatIds': arrayUnion(chatId) })
}

export const unlockChat = async (uid, chatId) => {
  await updateDoc(doc(db, 'users', uid), { 'security.lockedChatIds': arrayRemove(chatId) })
}

const SESSION_KEY = 'teenz_app_unlocked'

export const isUnlockedThisSession = () => sessionStorage.getItem(SESSION_KEY) === 'true'
export const markUnlockedThisSession = () => sessionStorage.setItem(SESSION_KEY, 'true')
