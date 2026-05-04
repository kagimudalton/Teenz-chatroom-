import { useState, useEffect } from 'react'
import { getUserWallpaper, PRESET_WALLPAPERS } from '../services/wallpaperService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useWallpaper = () => {
  const { user } = useAuth()
  const [wallpaper, setWallpaper] = useState(PRESET_WALLPAPERS[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserWallpaper(user.uid).then((wp) => {
      setWallpaper(wp)
      setLoading(false)
    })
  }, [user])

  const updateWallpaper = (wp) => setWallpaper(wp)

  return { wallpaper, loading, updateWallpaper }
}
