import { useState } from 'react'
import { verifyPin } from '../../services/lockService.js'

const LockScreen = ({ pinHash, onUnlock }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (pin.length < 4) return
    setChecking(true)
    setError('')
    const valid = await verifyPin(pin, pinHash)
    if (valid) {
      onUnlock()
    } else {
      setError('Incorrect PIN. Try again.')
      setPin('')
    }
    setChecking(false)
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen-card">
        <div className="lock-screen-icon">🔒</div>
        <h2>Teenz Chatroom is locked</h2>
        <p>Enter your PIN to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="lock-pin-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            autoFocus
          />
          {error && <p className="lock-screen-error">{error}</p>}
          <button type="submit" className="lock-unlock-btn" disabled={pin.length < 4 || checking}>
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockScreen
