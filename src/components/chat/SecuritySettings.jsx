import { useState, useEffect } from 'react'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { setAppLockPin, disableAppLock, setAppLockEnabled } from '../../services/lockService.js'
import { getBlockedUsers, unblockUser } from '../../services/userService.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const SecuritySettings = () => {
  const { user, userProfile, refreshProfile } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [blockedList, setBlockedList] = useState([])
  const [loadingBlocked, setLoadingBlocked] = useState(true)

  useEffect(() => {
    if (!user) return
    getBlockedUsers(user.uid).then(setBlockedList).finally(() => setLoadingBlocked(false))
  }, [user, userProfile?.blockedUsers])

  const handleUnblock = async (blockedUid) => {
    try {
      await unblockUser(user.uid, blockedUid)
      await refreshProfile()
      setBlockedList(prev => prev.filter(b => b.uid !== blockedUid))
      toast.success('Unblocked')
    } catch {
      toast.error('Failed to unblock')
    }
  }

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

      <h3 style={{ marginTop: 24 }}>Blocked users</h3>
      {loadingBlocked ? (
        <p className="account-switcher-email">Loading…</p>
      ) : blockedList.length === 0 ? (
        <p className="account-switcher-email">You haven't blocked anyone.</p>
      ) : (
        <div className="account-switcher-list">
          {blockedList.map(blocked => (
            <div key={blocked.uid} className="account-switcher-item" style={{ cursor: 'default' }}>
              <UserAvatar user={blocked} size={42} />
              <div className="account-switcher-info">
                <span className="account-switcher-name">{blocked.username}</span>
              </div>
              <button className="account-switcher-remove" onClick={() => handleUnblock(blocked.uid)} title="Unblock" style={{ width: 'auto', borderRadius: 8, padding: '0 10px', fontSize: '0.78rem' }}>
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SecuritySettings
