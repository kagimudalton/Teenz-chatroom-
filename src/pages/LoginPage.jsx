import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle } from '../services/authService.js'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/chat'
  const [form, setForm] = useState({ email: location.state?.prefillEmail || '', password: '' })
  const [ageVerified, setAgeVerified] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmail({ email: form.email, password: form.password, rememberMe })
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!ageVerified) { toast.error('Please confirm you are 13 or older.'); return }
    setLoading(true)
    try {
      await signInWithGoogle({ ageVerified, rememberMe })
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Teenz<span>Chat</span></div>
          <p className="auth-subtitle">Welcome back 👋</p>
        </div>
        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
          Continue with Google
        </button>
        <div className="auth-divider"><span>or sign in with email</span></div>
        <form className="auth-form" onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="••••••••" required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div className="form-checkboxes">
            <label className="checkbox-label">
              <input type="checkbox" checked={ageVerified} onChange={e => setAgeVerified(e.target.checked)} />
              <span className="checkmark" />I confirm I am 13 or older
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              <span className="checkmark" />Stay logged in
            </label>
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">No account? <Link to="/signup">Create one free</Link></p>
      </div>
    </div>
  )
}

export default LoginPage
