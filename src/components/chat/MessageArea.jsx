import { useState, useRef } from 'react'
import { useMessages } from '../../hooks/useMessages.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { sendTextMessage, sendMediaMessage, deleteMessageForUser } from '../../services/chatService.js'
import { formatTime, getStatusIcon } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const MessageArea = ({ conversationId, otherUser, onBackToSidebar }) => {
  const { user } = useAuth()
  const { messages, loading, bottomRef } = useMessages(conversationId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const handleSendText = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const msgText = text
    setText('')
    try {
      await sendTextMessage(conversationId, user.uid, otherUser.uid, msgText)
    } catch (err) {
      toast.error(err.message)
      setText(msgText)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(e) }
  }

  const handleMediaUpload = async (file, type) => {
    setSending(true)
    setShowMediaMenu(false)
    try {
      await sendMediaMessage(conversationId, user.uid, otherUser.uid, file, type)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const groupedMessages = groupByDate(messages)

  return (
    <div className="message-area" onClick={() => setShowMediaMenu(false)}>
      <div className="msg-header">
        <button className="back-to-sidebar" onClick={onBackToSidebar}>←</button>
        <div className="msg-header-user">
          <UserAvatar user={otherUser} size={38} />
          <div>
            <div className="msg-header-name">{otherUser.username}</div>
            <div className="msg-header-status">{otherUser.isOnline ? '🟢 Online' : 'Offline'}</div>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {loading ? <div className="messages-loading">Loading…</div> : messages.length === 0 ? (
          <div className="messages-empty"><p>No messages yet!</p><p>Say hi to {otherUser.username} 👋</p></div>
        ) : groupedMessages.map((group) => (
          <div key={group.dateLabel}>
            <div className="date-separator"><span>{group.dateLabel}</span></div>
            {group.messages.map((msg) => (
              <div key={msg.id} className={`msg-bubble-wrap ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
                <div className={`msg-bubble ${msg.senderId === user.uid ? 'mine' : 'theirs'} ${msg.type}`}>
                  {msg.type === 'text' && <p className="msg-text">{msg.text}</p>}
                  {msg.type === 'image' && <img src={msg.mediaURL} alt="Shared image" className="msg-image" loading="lazy" onClick={() => window.open(msg.mediaURL, '_blank')} />}
                  {msg.type === 'video' && <video src={msg.mediaURL} controls className="msg-video" preload="metadata" />}
                  {msg.type === 'audio' && <div className="msg-audio"><span>🎤</span><audio src={msg.mediaURL} controls /></div>}
                  <div className="msg-meta">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {msg.senderId === user.uid && <span className={`msg-status ${msg.status}`}>{getStatusIcon(msg.status)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="msg-input-bar" onSubmit={handleSendText}>
        <div className="media-menu-wrap">
          <button type="button" className="media-menu-btn" onClick={(e) => { e.stopPropagation(); setShowMediaMenu(v => !v) }}>📎</button>
          {showMediaMenu && (
            <div className="media-menu" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => imageInputRef.current?.click()}>🖼️ Image</button>
              <button type="button" onClick={() => videoInputRef.current?.click()}>🎬 Video</button>
            </div>
          )}
        </div>
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'video')} />
        <textarea className="msg-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Message ${otherUser.username}…`} rows={1} maxLength={2000} />
        <button type="submit" className={`send-btn ${text.trim() ? 'active' : ''}`} disabled={!text.trim() || sending}>{sending ? '…' : '➤'}</button>
      </form>
    </div>
  )
}

const groupByDate = (messages) => {
  const groups = {}
  for (const msg of messages) {
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date()
    const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(msg)
  }
  return Object.entries(groups).map(([dateLabel, msgs]) => ({ dateLabel, messages: msgs }))
}

export default MessageArea
