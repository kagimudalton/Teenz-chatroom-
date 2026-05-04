import { useState, useEffect } from 'react'
import { subscribeToConversations } from '../services/chatService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useConversations = () => {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  return { conversations, loading }
}
