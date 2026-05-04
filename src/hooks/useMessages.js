import { useState, useEffect, useRef } from 'react'
import { subscribeToMessages, markMessagesAsRead } from '../services/chatService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!conversationId || !user) return
    setLoading(true)
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs)
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    markMessagesAsRead(conversationId, user.uid).catch(console.error)
    return () => unsubscribe()
  }, [conversationId, user])

  return { messages, loading, bottomRef }
}
