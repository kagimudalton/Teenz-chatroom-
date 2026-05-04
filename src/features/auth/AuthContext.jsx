import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { subscribeToAuthChanges, getUserDocument, signOutUser } from '../../services/authService.js'
import { trackActiveUser } from '../../services/analyticsService.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const profile = await getUserDocument(firebaseUser.uid)
        setUserProfile(profile)
        trackActiveUser(firebaseUser.uid)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await getUserDocument(user.uid)
      setUserProfile(profile)
    }
  }, [user])

  const logout = useCallback(async () => { await signOutUser() }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
