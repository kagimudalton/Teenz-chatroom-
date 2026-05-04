import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../services/authService.js'
import { isValidEmail, isValidUsername } from '../utils/helpers.js'
import toast from 'react-hot-toast'

const SignupPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [ageVerified, setAgeVerified] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!isValidEmail(form.email)) { toast.error('Invalid email'); return }
    if (!isValidUsername(form.username)) { toast.error('Username: 3-20 chars, letters/numbers/_'); return }
    if (form.password.length < 8) { toast.error('Password needs 8+ chars'); return }
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match!"); return }
    setStep(2)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!ageVerified) { toast.error('Confirm you are 13+'); return }
    if (!termsAccepted) { toast.error('Accept the terms first'); return }
    setLoading(true)
    try {
      await signUpWithEmail({ email: form.email, password: form.password, username: form.username, ageVerified, photoFile })
      toast.success('Welcome to Teenz Chat! 🎉')
      navigate('/chat')
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Teenz<span>Chat</span></div>
          <p className="auth-subtitle">{step === 1 ? 'Create your account ✨' : 'Almost there! 🚀'}</p>
        </div>
        <div className="step-dots">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>
        {step === 1 && (
          <form className="auth-form" onSubmit={handleStep1}>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input name="username" type="text" value={form.username} onChange={handleChange} placeholder="cooluser123" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="8+ characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Same as above" required />
            </div>
            <button type="submit" className="auth-submit-btn">Next →</button>
          </form>
        )}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="avatar-upload-section">
              <label className="avatar-upload-label" htmlFor="photo-upload">
                {photoPreview ? <img src={photoPreview} alt="Preview" className="avatar-preview" /> : <div className="avatar-placeholder">📸<br/><span>Add a pic (optional)</span></div>}
              </label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </div>
            <div className="form-checkboxes">
              <label className="checkbox-label">
                <input type="checkbox" checked={ageVerified} onChange={e => setAgeVerified(e.target.checked)} />
                <span className="checkmark" />I am 13 or older ✅
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                <span className="checkmark" />I agree to the Terms & Privacy Policy
              </label>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account 🎉'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(1)}>← Back</button>
          </form>
        )}
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}

export default SignupPage
