import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useConversations = () => {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const userCache = useRef({})

  useEffect(() => {
    if (!user) return

    setLoading(true)

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const convPromises = snapshot.docs.map(async (d) => {
          const conv = d.data()
          const otherUserId = conv.participants?.find((p) => p !== user.uid)
          if (!otherUserId) return null

          // Cache user lookups to avoid repeated Firestore reads
          if (!userCache.current[otherUserId]) {
            try {
              const userSnap = await getDoc(doc(db, 'users', otherUserId))
              userCache.current[otherUserId] = userSnap.exists()
                ? userSnap.data()
                : { uid: otherUserId, username: 'Unknown' }
            } catch {
              userCache.current[otherUserId] = { uid: otherUserId, username: 'Unknown' }
            }
          }

          return {
            ...conv,
            id: d.id,
            otherUser: userCache.current[otherUserId],
          }
        })

        const results = await Promise.all(convPromises)
        const filtered = results.filter(Boolean)

        // Sort by lastMessageAt descending
        filtered.sort((a, b) => {
          const aTime = a.lastMessageAt?.toMillis?.() || 0
          const bTime = b.lastMessageAt?.toMillis?.() || 0
          return bTime - aTime
        })

        setConversations(filtered)
        setLoading(false)
      } catch (err) {
        console.warn('useConversations error:', err)
        setLoading(false)
      }
    }, (err) => {
      console.warn('Conversations snapshot error:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  return { conversations, loading }
}
