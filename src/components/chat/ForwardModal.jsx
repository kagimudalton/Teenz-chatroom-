import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { useConversations } from '../../hooks/useConversations.js'
import { forwardMessage, getOrCreateConversation } from '../../services/chatService.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const ForwardModal = ({ message, onClose }) => {
  const { user } = useAuth()
  const { conversations } = useConversations()
  const [forwarding, setForwarding] = useState(null)

  const handleForward = async (conv) => {
    setForwarding(conv.id)
    try {
      const convId = await getOrCreateConversation(user.uid, conv.otherUser.uid)
      await forwardMessage(convId, user.uid, conv.otherUser.uid, message)
      toast.success(`Forwarded to ${conv.otherUser.username}! ↗️`)
      onClose()
    } catch (err) {
      toast.error('Failed to forward message')
    } finally {
      setForwarding(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>↗️ Forward to</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="search-results">
          {conversations.length === 0 && (
            <div className="search-empty">No conversations yet</div>
          )}
          {conversations.map(conv => (
            <button
              key={conv.id}
              className="search-result-item"
              onClick={() => handleForward(conv)}
              disabled={forwarding === conv.id}
            >
              <UserAvatar user={conv.otherUser} size={42} />
              <div className="result-info">
                <span className="result-name">{conv.otherUser?.username}</span>
              </div>
              <span className="result-action">
                {forwarding === conv.id ? '…' : '↗️'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ForwardModal
