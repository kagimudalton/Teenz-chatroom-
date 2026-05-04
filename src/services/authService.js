import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, updateProfile, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db, setAuthPersistence } from './firebase.js'
import { uploadAvatar } from './cloudinaryService.js'
import { logEvent } from './analyticsService.js'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const createUserDocument = async (uid, data) => {
  const userRef = doc(db, 'users', uid)
  const existing = await getDoc(userRef)
  if (!existing.exists()) {
    await setDoc(userRef, { uid, email: data.email || '', username: data.username || data.displayName || '', photoURL: data.photoURL || '', ageVerified: data.ageVerified || false, bio: '', isOnline: true, lastSeen: serverTimestamp(), createdAt: serverTimestamp() })
  } else {
    await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() })
  }
}

export const signUpWithEmail = async ({ email, password, username, ageVerified, rememberMe = true, photoFile = null }) => {
  if (!ageVerified) throw new Error('You must confirm you are 13 or older.')
  await setAuthPersistence(rememberMe)
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  let photoURL = ''
  if (photoFile) { try { photoURL = await uploadAvatar(photoFile) } catch (err) { console.warn('Avatar upload failed:', err.message) } }
  await updateProfile(user, { displayName: username, photoURL })
  await createUserDocument(user.uid, { email: user.email, username, photoURL, ageVerified })
  logEvent('sign_up', { method: 'email' })
  return user
}

export const signInWithEmail = async ({ email, password, rememberMe = true }) => {
  await setAuthPersistence(rememberMe)
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await createUserDocument(user.uid, { email: user.email })
  logEvent('login', { method: 'email' })
  return user
}

export const signInWithGoogle = async ({ ageVerified, rememberMe = true }) => {
  if (!ageVerified) throw new Error('You must confirm you are 13 or older.')
  await setAuthPersistence(rememberMe)
  const { user } = await signInWithPopup(auth, googleProvider)
  await createUserDocument(user.uid, { email: user.email, displayName: user.displayName, photoURL: user.photoURL, ageVerified })
  logEvent('login', { method: 'google' })
  return user
}

export const signOutUser = async () => {
  const uid = auth.currentUser?.uid
  if (uid) await updateDoc(doc(db, 'users', uid), { isOnline: false, lastSeen: serverTimestamp() })
  await signOut(auth)
}

export const resetPassword = async (email) => sendPasswordResetEmail(auth, email)
export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback)
export const getUserDocument = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}
