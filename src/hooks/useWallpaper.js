import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase.js'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { PRESET_WALLPAPERS } from '../services/wallpaperService.js'

export const useWallpaper = () => {
  const { user } = useAuth()
  const [wallpaper, setWallpaper] = useState(PRESET_WALLPAPERS[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Use realtime listener so wallpaper updates instantly
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists() && snap.data().wallpaper) {
        setWallpaper(snap.data().wallpaper)
      } else {
        setWallpaper(PRESET_WALLPAPERS[0])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const updateWallpaper = async (wp) => {
    setWallpaper(wp)
    // Also save to Firestore immediately
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { wallpaper: wp })
      } catch (err) {
        console.warn('Failed to save wallpaper:', err)
      }
    }
  }

  return { wallpaper, loading, updateWallpaper }
}
