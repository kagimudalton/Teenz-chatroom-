import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { getSavedAccounts, removeSavedAccount } from '../../services/accountsService.js'
import { signInWithGoogle } from '../../services/authService.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const AccountSwitcher = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState(getSavedAccounts())
  const [switching, setSwitching] = useState(false)

  const otherAccounts = accounts.filter(a => a.uid !== user?.uid)

  const handleSwitch = async (account) => {
    setSwitching(true)
    try {
      if (account.authProvider === 'google') {
        // Don't await sign-out first — Firebase simply replaces the current
        // session when a new Google account signs in. Awaiting anything here
        // consumes the browser's "recent click" window and gets the popup blocked.
        if (user?.uid) {
          updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {})
        }
        const signedInUser = await signInWithGoogle({ ageVerified: true, rememberMe: true })
        if (signedInUser) navigate('/chat', { replace: true })
        // If signedInUser is null, a redirect-based fallback kicked in and the page is navigating away.
      } else {
        await logout()
        navigate('/login', { state: { prefillEmail: account.email } })
      }
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast.error('Could not switch accounts. Please try again.')
      }
      if (account.authProvider !== 'google') {
        navigate('/login', { state: { prefillEmail: account.email } })
      }
    } finally {
      setSwitching(false)
    }
  }

  const handleRemove = (e, uid) => {
    e.stopPropagation()
    removeSavedAccount(uid)
    setAccounts(getSavedAccounts())
  }

  const handleAddAccount = async () => {
    await logout()
    navigate('/login')
  }

  if (otherAccounts.length === 0) {
    return (
      <div className="account-switcher">
        <h3>Accounts</h3>
        <button className="add-account-btn" onClick={handleAddAccount}>+ Add another account</button>
      </div>
    )
  }

  return (
    <div className="account-switcher">
      <h3>Switch account</h3>
      <div className="account-switcher-list">
        {otherAccounts.map(account => (
          <div key={account.uid} className="account-switcher-item" onClick={() => !switching && handleSwitch(account)}>
            <UserAvatar user={account} size={42} />
            <div className="account-switcher-info">
              <span className="account-switcher-name">{account.username}</span>
              <span className="account-switcher-email">{account.email}</span>
            </div>
            <button className="account-switcher-remove" onClick={(e) => handleRemove(e, account.uid)} title="Forget this account">✕</button>
          </div>
        ))}
      </div>
      <button className="add-account-btn" onClick={handleAddAccount} disabled={switching}>+ Add another account</button>
    </div>
  )
}

export default AccountSwitcher
