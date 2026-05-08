import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

const DEFAULT_WALLPAPER = { id: 'default', name: 'Default', type: 'gradient', value: 'linear-gradient(135deg, #0F0C29, #302B63, #24243E)' }

export const useWallpaper = () => {
  const { user } = useAuth()
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPER)

  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists() && snap.data().wallpaper) {
        setWallpaper(snap.data().wallpaper)
      } else {
        setWallpaper(DEFAULT_WALLPAPER)
      }
    })
    return () => unsubscribe()
  }, [user])

  const updateWallpaper = (wp) => setWallpaper(wp)

  return { wallpaper, updateWallpaper }
}
