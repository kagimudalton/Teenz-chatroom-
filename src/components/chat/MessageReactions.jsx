import { useState } from 'react'
import { addReaction } from '../../services/chatService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'

const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','😡']

const MessageReactions = ({ message, conversationId }) => {
  const { user } = useAuth()
  const [showPicker, setShowPicker] = useState(false)
  const reactions = message.reactions || {}

  const handleReact = async (emoji) => {
    setShowPicker(false)
    await addReaction(conversationId, message.messageId || message.id, user.uid, emoji)
  }

  const hasReactions = Object.keys(reactions).length > 0

  return (
    <div className="msg-reactions-wrap">
      {/* Quick reaction picker */}
      {showPicker && (
        <div className="quick-reactions" onClick={e => e.stopPropagation()}>
          {QUICK_REACTIONS.map(emoji => (
            <button key={emoji} className="quick-reaction-btn" onClick={() => handleReact(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Existing reactions */}
      {hasReactions && (
        <div className="reactions-display">
          {Object.entries(reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              className={`reaction-chip ${users.includes(user.uid) ? 'mine' : ''}`}
              onClick={() => handleReact(emoji)}
            >
              {emoji} <span>{users.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Long press trigger */}
      <button
        className="reaction-trigger"
        onClick={(e) => { e.stopPropagation(); setShowPicker(v => !v) }}
      >
        +
      </button>
    </div>
  )
}

export default MessageReactions
