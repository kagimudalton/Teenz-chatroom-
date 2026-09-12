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
            duration: 3500,
            style: {
              background: 'rgba(20, 16, 50, 0.97)',
              color: '#F0EEFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              fontSize: '0.9rem',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            },
            success: {
              iconTheme: { primary: '#00E5FF', secondary: '#0F0C29' },
              style: {
                border: '1px solid rgba(0,229,255,0.35)',
                background: 'linear-gradient(135deg, rgba(20,16,50,0.97), rgba(0,60,70,0.5))',
              },
            },
            error: {
              iconTheme: { primary: '#FF6B6B', secondary: '#0F0C29' },
              style: {
                border: '1px solid rgba(255,107,107,0.4)',
                background: 'linear-gradient(135deg, rgba(20,16,50,0.97), rgba(60,20,20,0.5))',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
