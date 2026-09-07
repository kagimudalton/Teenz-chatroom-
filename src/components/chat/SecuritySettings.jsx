import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { setAppLockPin, disableAppLock, setAppLockEnabled } from '../../services/lockService.js'
import toast from 'react-hot-toast'

const SecuritySettings = () => {
  const { user, userProfile, refreshProfile } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)

  const security = userProfile?.security || {}
  const hasPinSet = !!security.pinHash

  const handleSetPin = async (e) => {
    e.preventDefault()
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits.')
      return
    }
    if (pin !== confirmPin) {
      toast.error("PINs don't match.")
      return
    }
    setSaving(true)
    try {
      await setAppLockPin(user.uid, pin)
      await refreshProfile()
      toast.success('App lock enabled!')
      setShowSetup(false)
      setPin('')
      setConfirmPin('')
    } catch (err) {
      toast.error('Failed to set PIN.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAppLock = async (enabled) => {
    try {
      await setAppLockEnabled(user.uid, enabled)
      await refreshProfile()
    } catch (err) {
      toast.error('Failed to update app lock.')
    }
  }

  const handleRemovePin = async () => {
    try {
      await disableAppLock(user.uid)
      await refreshProfile()
      toast.success('App lock removed.')
    } catch (err) {
      toast.error('Failed to remove app lock.')
    }
  }

  return (
    <div className="security-settings">
      <h3>Security</h3>

      {!hasPinSet && !showSetup && (
        <button className="add-account-btn" onClick={() => setShowSetup(true)}>🔒 Set up app lock (PIN)</button>
      )}

      {showSetup && (
        <form className="security-pin-form" onSubmit={handleSetPin}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter a 4-6 digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="lock-pin-input"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="lock-pin-input"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="lock-unlock-btn" disabled={saving}>Save PIN</button>
            <button type="button" className="edit-cancel-btn" onClick={() => { setShowSetup(false); setPin(''); setConfirmPin('') }}>Cancel</button>
          </div>
        </form>
      )}

      {hasPinSet && (
        <div className="security-lock-row">
          <div>
            <span className="account-switcher-name">App lock</span>
            <p className="account-switcher-email">Require your PIN when opening the app</p>
          </div>
          <label className="security-toggle">
            <input
              type="checkbox"
              checked={!!security.appLockEnabled}
              onChange={(e) => handleToggleAppLock(e.target.checked)}
            />
            <span className="security-toggle-slider" />
          </label>
        </div>
      )}

      {hasPinSet && (
        <button className="add-account-btn" onClick={handleRemovePin}>Remove PIN & app lock</button>
      )}

      <p className="security-hint">
        You can also lock individual chats from that chat's menu, once a PIN is set.
      </p>
    </div>
  )
}

export default SecuritySettings
