import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      await logout()
      if (account.authProvider === 'google') {
        await signInWithGoogle({ ageVerified: true, rememberMe: true })
        navigate('/chat', { replace: true })
      } else {
        navigate('/login', { state: { prefillEmail: account.email } })
      }
    } catch (err) {
      toast.error('Could not switch accounts. Please log in manually.')
      navigate('/login', { state: { prefillEmail: account.email } })
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
