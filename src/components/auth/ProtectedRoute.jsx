import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import SplashScreen from '../ui/SplashScreen.jsx'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <SplashScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
