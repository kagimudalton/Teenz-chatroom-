import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './features/auth/AuthContext.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SplashScreen from './components/ui/SplashScreen.jsx'
import './styles/global.css'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/chat" element={
            <ProtectedRoute><ChatPage /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20, 16, 50, 0.97)',
              color: '#F0EEFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '0.9rem',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
