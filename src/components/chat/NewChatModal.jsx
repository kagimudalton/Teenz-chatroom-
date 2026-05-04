import { useState } from 'react'
import { searchUsers, getOrCreateConversation } from '../../services/chatService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const NewChatModal = ({ onClose, onStartConversation }) => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState(null)

  const handleSearch = async (e) => {
    const val = e.target.value
    setQuery(val)
    if (val.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const users = await searchUsers(val, user.uid)
      setResults(users)
    } catch (err) {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleStartChat = async (otherUser) => {
    setStarting(otherUser.uid)
    try {
      const convId = await getOrCreateConversation(user.uid, otherUser.uid)
      onStartConversation(convId, otherUser)
    } catch (err) {
      toast.error('Could not start conversation')
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Chat</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <input className="search-input" type="text" value={query} onChange={handleSearch} placeholder="Search by username…" autoFocus />
        <div className="search-results">
          {searching && <div className="search-loading">Searching…</div>}
          {!searching && query.length >= 2 && results.length === 0 && <div className="search-empty">No users found</div>}
          {results.map((u) => (
            <button key={u.uid} className="search-result-item" onClick={() => handleStartChat(u)} disabled={starting === u.uid}>
              <UserAvatar user={u} size={42} />
              <div className="result-info">
                <span className="result-name">{u.username}</span>
                {u.bio && <span className="result-bio">{u.bio}</span>}
              </div>
              <span className="result-action">{starting === u.uid ? '…' : 'Chat →'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NewChatModal
