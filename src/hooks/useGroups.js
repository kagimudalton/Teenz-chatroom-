import { useState, useEffect } from 'react'
import { subscribeToGroups } from '../services/groupService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useGroups = () => {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToGroups(user.uid, (grps) => {
      setGroups(grps)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  return { groups, loading }
}
