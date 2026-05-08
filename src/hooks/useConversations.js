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
          
          // Find the OTHER user (not current user)
          const otherUserId = conv.participants?.find((p) => p !== user.uid)
          if (!otherUserId) return null

          // Cache to avoid repeated reads
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

        const results = (await Promise.all(convPromises)).filter(Boolean)

        // Sort by most recent message
        results.sort((a, b) => {
          const aTime = a.lastMessageAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
          const bTime = b.lastMessageAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0
          return bTime - aTime
        })

        setConversations(results)
        setLoading(false)
      } catch (err) {
        console.warn('useConversations error:', err)
        setLoading(false)
      }
    }, (err) => {
      console.warn('Snapshot error:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  return { conversations, loading }
}
