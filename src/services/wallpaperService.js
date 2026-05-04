import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadToCloudinary } from './cloudinaryService.js'

export const PRESET_WALLPAPERS = [
  { id: 'default', name: 'Default', type: 'gradient', value: 'linear-gradient(135deg, #0F0C29, #302B63, #24243E)' },
  { id: 'midnight', name: 'Midnight', type: 'gradient', value: 'linear-gradient(135deg, #000000, #1a1a2e, #16213e)' },
  { id: 'ocean', name: 'Ocean', type: 'gradient', value: 'linear-gradient(135deg, #0077b6, #00b4d8, #90e0ef)' },
  { id: 'forest', name: 'Forest', type: 'gradient', value: 'linear-gradient(135deg, #1b4332, #2d6a4f, #52b788)' },
  { id: 'sunset', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #f77f00, #d62828, #7209b7)' },
  { id: 'candy', name: 'Candy', type: 'gradient', value: 'linear-gradient(135deg, #ff6b9d, #c44dff, #6b9dff)' },
  { id: 'dark', name: 'Pure Dark', type: 'solid', value: '#0a0a0a' },
  { id: 'navy', name: 'Navy', type: 'solid', value: '#0d1b2a' },
  { id: 'purple', name: 'Deep Purple', type: 'solid', value: '#1a0533' },
  { id: 'green', name: 'Dark Green', type: 'solid', value: '#0d2818' },
]

export const saveWallpaper = async (userId, wallpaper) => {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, { wallpaper })
}

export const uploadCustomWallpaper = async (userId, file) => {
  if (file.size > 10 * 1024 * 1024) throw new Error('Wallpaper must be under 10MB')
  const url = await uploadToCloudinary(file, 'image')
  const wallpaper = { id: 'custom', name: 'Custom', type: 'image', value: url }
  await saveWallpaper(userId, wallpaper)
  return wallpaper
}

export const getUserWallpaper = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? snap.data().wallpaper || PRESET_WALLPAPERS[0] : PRESET_WALLPAPERS[0]
}
