// Remembers previously-logged-in accounts on this browser so the user can
// quickly switch between them, similar to WhatsApp's account switcher.
// No passwords are ever stored — only public profile metadata + auth method.

const STORAGE_KEY = 'teenz_saved_accounts'

export const getSavedAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const saveAccount = ({ uid, email, username, photoURL, authProvider }) => {
  if (!uid) return
  const accounts = getSavedAccounts()
  const existingIndex = accounts.findIndex(a => a.uid === uid)
  const entry = { uid, email, username, photoURL: photoURL || null, authProvider: authProvider || 'password', lastUsed: Date.now() }
  if (existingIndex >= 0) {
    accounts[existingIndex] = entry
  } else {
    accounts.push(entry)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export const removeSavedAccount = (uid) => {
  const accounts = getSavedAccounts().filter(a => a.uid !== uid)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}
