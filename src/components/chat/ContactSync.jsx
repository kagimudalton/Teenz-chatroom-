import { useState, useEffect } from 'react'
import { getPhoneContacts, matchContactsWithUsers, getSuggestedUsers } from '../../services/contactService.js'
import { getOrCreateConversation } from '../../services/chatService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const ContactSync = ({ onStartConversation, onClose }) => {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [suggested, setSuggested] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [starting, setStarting] = useState(null)
  const [tab, setTab] = useState('suggested') // suggested | contacts

  useEffect(() => {
    loadSuggested()
  }, [])

  const loadSuggested = async () => {
    setLoading(true)
    try {
      const users = await getSuggestedUsers(user.uid)
      setSuggested(users)
    } catch (err) {
      console.warn('Failed to load suggested:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncContacts = async () => {
    setSyncing(true)
    try {
      const phoneContacts = await getPhoneContacts()
      const matched = await matchContactsWithUsers(phoneContacts)
      setContacts(matched)
      setTab('contacts')
      toast.success(`Found ${matched.length} contacts on Teenz Chatroom! 🎉`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleStartChat = async (otherUser) => {
    setStarting(otherUser.uid)
    try {
      const convId = await getOrCreateConversation(user.uid, otherUser.uid)
      onStartConversation(convId, otherUser)
      onClose()
    } catch {
      toast.error('Could not start conversation')
    } finally {
      setStarting(null)
    }
  }

  const displayUsers = tab === 'contacts' ? contacts : suggested

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 People</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="contacts-tabs">
          <button
            className={`contacts-tab ${tab === 'suggested' ? 'active' : ''}`}
            onClick={() => setTab('suggested')}
          >
            Suggested
          </button>
          <button
            className={`contacts-tab ${tab === 'contacts' ? 'active' : ''}`}
            onClick={() => setTab('contacts')}
          >
            My Contacts {contacts.length > 0 && `(${contacts.length})`}
          </button>
        </div>

        {/* Sync contacts button */}
        {tab === 'contacts' && contacts.length === 0 && (
          <div className="sync-contacts-section">
            <div className="sync-icon">📱</div>
            <p>Find friends from your phone contacts who are on Teenz Chatroom</p>
            <button
              className="auth-submit-btn"
              onClick={handleSyncContacts}
              disabled={syncing}
              style={{ maxWidth: 240, margin: '0 auto' }}
            >
              {syncing ? <span className="btn-spinner" /> : '🔄 Sync Contacts'}
            </button>
            <p className="sync-note">We only check emails — contacts are never stored</p>
          </div>
        )}

        {/* Users list */}
        <div className="search-results">
          {loading && <div className="search-loading">Loading…</div>}
          {!loading && displayUsers.length === 0 && tab === 'suggested' && (
            <div className="search-empty">No suggested users yet</div>
          )}
          {displayUsers.map(u => (
            <button
              key={u.uid}
              className="search-result-item"
              onClick={() => handleStartChat(u)}
              disabled={starting === u.uid}
            >
              <UserAvatar user={u} size={46} />
              <div className="result-info">
                <span className="result-name">{u.username}</span>
                {u.bio && <span className="result-bio">{u.bio}</span>}
              </div>
              <span className="result-action">
                {starting === u.uid ? '…' : 'Chat →'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ContactSync
