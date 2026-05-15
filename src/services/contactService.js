import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * Get phone contacts using browser Contacts API
 * Only works on Android Chrome and some mobile browsers
 */
export const getPhoneContacts = async () => {
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    throw new Error('Contact sync not supported on this browser')
  }

  const props = ['name', 'email', 'tel']
  const opts = { multiple: true }

  try {
    const contacts = await navigator.contacts.select(props, opts)
    return contacts
  } catch (err) {
    throw new Error('Contact access denied or cancelled')
  }
}

/**
 * Match phone contacts with app users via email or phone
 */
export const matchContactsWithUsers = async (contacts) => {
  const emails = contacts
    .flatMap(c => c.email || [])
    .filter(Boolean)
    .map(e => e.toLowerCase())

  if (emails.length === 0) return []

  // Firestore limits 'in' queries to 30 items
  const chunks = []
  for (let i = 0; i < emails.length; i += 30) {
    chunks.push(emails.slice(i, i + 30))
  }

  const results = []
  for (const chunk of chunks) {
    const q = query(collection(db, 'users'), where('email', 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach(d => results.push(d.data()))
  }

  return results
}

/**
 * Get suggested users - recently joined, most active
 */
export const getSuggestedUsers = async (currentUserId) => {
  const q = query(collection(db, 'users'))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data())
    .filter(u => u.uid !== currentUserId)
    .slice(0, 20)
}
