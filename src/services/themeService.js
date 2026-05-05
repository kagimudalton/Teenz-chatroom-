import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase.js'

export const PRESET_THEMES = [
  { id: 'purple', name: 'Purple', primary: '#6C4DFF', secondary: '#00E5FF', bg: 'linear-gradient(135deg, #0F0C29, #302B63, #24243E)' },
  { id: 'green', name: 'Lime Green', primary: '#00FF88', secondary: '#00E5FF', bg: 'linear-gradient(135deg, #001a0e, #003320, #004d2e)' },
  { id: 'red', name: 'Red', primary: '#FF4444', secondary: '#FF8C00', bg: 'linear-gradient(135deg, #1a0000, #330000, #4d0000)' },
  { id: 'blue', name: 'Ocean Blue', primary: '#0088FF', secondary: '#00E5FF', bg: 'linear-gradient(135deg, #000d1a, #001a33, #00264d)' },
  { id: 'pink', name: 'Pink', primary: '#FF6B9D', secondary: '#C44DFF', bg: 'linear-gradient(135deg, #1a0011, #330022, #4d0033)' },
  { id: 'gold', name: 'Gold', primary: '#FFD700', secondary: '#FF8C00', bg: 'linear-gradient(135deg, #1a1400, #332800, #4d3c00)' },
  { id: 'cyan', name: 'Cyan', primary: '#00E5FF', secondary: '#00FF88', bg: 'linear-gradient(135deg, #001a1a, #003333, #004d4d)' },
  { id: 'orange', name: 'Orange', primary: '#FF6B00', secondary: '#FFD700', bg: 'linear-gradient(135deg, #1a0a00, #331400, #4d1e00)' },
]

export const applyTheme = (theme) => {
  const root = document.documentElement
  root.style.setProperty('--accent-purple', theme.primary)
  root.style.setProperty('--accent-cyan', theme.secondary)
  root.style.setProperty('--accent-purple-glow', theme.primary + '55')
  root.style.setProperty('--bg-gradient', theme.bg)
  root.style.setProperty('--border-accent', theme.primary + '66')
  root.style.setProperty('--bubble-mine', `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`)
}

export const saveTheme = async (userId, theme) => {
  await updateDoc(doc(db, 'users', userId), { theme })
  applyTheme(theme)
}

export const loadUserTheme = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId))
  if (snap.exists() && snap.data().theme) {
    applyTheme(snap.data().theme)
    return snap.data().theme
  }
  return PRESET_THEMES[0]
}
