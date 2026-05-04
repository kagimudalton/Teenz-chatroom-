import { useState, useEffect } from 'react'
import { subscribeToStories } from '../services/storiesService.js'

export const useStories = () => {
  const [storiesByUser, setStoriesByUser] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToStories((grouped) => {
      setStoriesByUser(grouped)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return { storiesByUser, loading }
}
