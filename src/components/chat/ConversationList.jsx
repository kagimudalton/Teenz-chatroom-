import { useAuth } from '../../features/auth/AuthContext.jsx'
import { formatTimestamp, truncate } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'

const ConversationList = ({ conversations, loading, activeId, onSelect }) => {
  const { user } = useAuth()

  if (loading) {
    return (
      <div className="conv-list">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="conv-skeleton">
            <div className="skeleton-avatar" />
            <div className="skeleton-text">
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="conv-list-empty">
        <p>No chats yet!</p>
        <p>Hit "New Chat" to say hi 👋</p>
      </div>
    )
  }

  return (
    <div className="conv-list">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId
        const unread = conv.unreadCount?.[user.uid] || 0
        const lastMsg = conv.lastMessage
        return (
          <button key={conv.id} className={`conv-item ${isActive ? 'active' : ''}`} onClick={() => onSelect(conv)}>
            <div className="conv-avatar-wrap">
              <UserAvatar user={conv.otherUser} size={46} />
              {conv.otherUser?.isOnline && <span className="online-dot" />}
            </div>
            <div className="conv-info">
              <div className="conv-top">
                <span className="conv-name">{conv.otherUser?.username || 'Unknown'}</span>
                <span className="conv-time">{formatTimestamp(conv.lastMessageAt)}</span>
              </div>
              <div className="conv-bottom">
                <span className="conv-last-msg">
                  {lastMsg ? lastMsg.senderId === user.uid ? `You: ${lastMsg.type === 'text' ? truncate(lastMsg.text, 28) : `📎 ${lastMsg.type}`}` : lastMsg.type === 'text' ? truncate(lastMsg.text, 30) : `📎 ${lastMsg.type}` : 'Say something!'}
                </span>
                {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ConversationList
