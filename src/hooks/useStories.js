import { useState, useEffect } from 'react'
import { subscribeToStories } from '../services/storiesService.js'
import { getContactIds } from '../services/chatService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useStories = () => {
  const { user } = useAuth()
  const [storiesByUser, setStoriesByUser] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let unsubscribe = null
    let cancelled = false

    getContactIds(user.uid).then((contactIds) => {
      if (cancelled) return
      unsubscribe = subscribeToStories(user.uid, contactIds, (grouped) => {
        setStoriesByUser(grouped)
        setLoading(false)
      })
    }).catch((err) => {
      console.warn('Failed to load contacts for stories:', err)
      setLoading(false)
    })

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  return { storiesByUser, loading }
}
