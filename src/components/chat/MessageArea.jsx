import { useState, useRef, useEffect } from 'react'
import { useMessages } from '../../hooks/useMessages.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { useWallpaper } from '../../hooks/useWallpaper.js'
import { sendTextMessage, sendMediaMessage, editMessage } from '../../services/chatService.js'
import { subscribeToUserStatus, formatLastSeen, reportUser } from '../../services/userService.js'
import { formatTime, getStatusIcon } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import WallpaperPicker from './WallpaperPicker.jsx'
import EmojiPicker from './EmojiPicker.jsx'
import toast from 'react-hot-toast'

const MessageArea = ({ conversationId, otherUser, onBackToSidebar, onStartCall }) => {
  const { user } = useAuth()
  const { messages, loading, bottomRef } = useMessages(conversationId)
  const { wallpaper, updateWallpaper } = useWallpaper()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showWallpaper, setShowWallpaper] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null })
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!otherUser?.uid) return
    const unsubscribe = subscribeToUserStatus(otherUser.uid, setUserStatus)
    return () => unsubscribe()
  }, [otherUser?.uid])

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

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = text.slice(0, start) + emoji + text.slice(end)
      setText(newText)
      setTimeout(() => {
        textarea.selectionStart = start + emoji.length
        textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 10)
    } else {
      setText(prev => prev + emoji)
    }
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

  const handleEditMessage = async () => {
    if (!editingMsg || !editText.trim()) return
    try {
      await editMessage(conversationId, editingMsg.messageId || editingMsg.id, editText)
      toast.success('Message edited!')
      setEditingMsg(null)
      setEditText('')
    } catch (err) {
      toast.error('Failed to edit message')
    }
  }

  const handleReport = async () => {
    try {
      await reportUser(user.uid, otherUser.uid, 'Reported by user')
      toast.success('User reported ✅')
      setShowMenu(false)
    } catch {
      toast.error('Failed to report')
    }
  }

  const getWallpaperStyle = () => {
    if (!wallpaper || wallpaper.id === 'default') return {}
    if (wallpaper.type === 'image') return {
      backgroundImage: `url(${wallpaper.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
    return { background: wallpaper.value }
  }

  const hasWallpaper = wallpaper && wallpaper.id !== 'default'
  const statusText = userStatus.isOnline ? 'Online' : formatLastSeen(userStatus.lastSeen)
  const groupedMessages = groupByDate(messages)

  return (
    <div className="message-area" onClick={() => { setShowMediaMenu(false); setShowMenu(false); setShowEmoji(false) }}>
      {showWallpaper && (
        <WallpaperPicker
          currentWallpaper={wallpaper}
          onClose={() => setShowWallpaper(false)}
          onWallpaperChange={(wp) => { updateWallpaper(wp); setShowWallpaper(false) }}
        />
      )}

      <div className="msg-header">
        <button className="back-to-sidebar" onClick={onBackToSidebar} />
        <div className="msg-header-user">
          <UserAvatar user={otherUser} size={38} showViewer={true} />
          <div>
            <div className="msg-header-name">{otherUser.username}</div>
            <div className={`msg-header-status ${userStatus.isOnline ? 'online' : ''}`}>
              {statusText}
            </div>
          </div>
        </div>
        <div className="msg-header-actions">
          <button className="call-btn audio" onClick={() => onStartCall('audio')} title="Voice call" />
          <button className="call-btn video" onClick={() => onStartCall('video')} title="Video call" />
          <button className="call-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }} title="More" />
        </div>

        {showMenu && (
          <div className="header-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowWallpaper(true); setShowMenu(false) }}>🎨 Wallpaper</button>
            <button onClick={handleReport}>🚩 Report</button>
          </div>
        )}
      </div>

      <div
        className={`messages-container ${hasWallpaper ? 'has-wallpaper' : ''}`}
        style={getWallpaperStyle()}
      >
        {loading ? (
          <div className="messages-loading">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <p>No messages yet!</p>
            <p>Say hi to {otherUser.username} 👋</p>
          </div>
        ) : groupedMessages.map((group) => (
          <div key={group.dateLabel}>
            <div className="date-separator"><span>{group.dateLabel}</span></div>
            {group.messages.map((msg) => (
              <div key={msg.id} className={`msg-bubble-wrap ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
                <div
                  className={`msg-bubble ${msg.senderId === user.uid ? 'mine' : 'theirs'} ${msg.type}`}
                  onDoubleClick={() => {
                    if (msg.senderId === user.uid && msg.type === 'text') {
                      setEditingMsg(msg)
                      setEditText(msg.text)
                    }
                  }}
                >
                  {msg.type === 'text' && (
                    <p className="msg-text">
                      {msg.text}
                      {msg.edited && <span className="msg-edited"> (edited)</span>}
                    </p>
                  )}
                  {msg.type === 'image' && (
                    <img src={msg.mediaURL} alt="Shared" className="msg-image" loading="lazy" onClick={() => window.open(msg.mediaURL, '_blank')} />
                  )}
                  {msg.type === 'video' && (
                    <video src={msg.mediaURL} controls className="msg-video" preload="metadata" />
                  )}
                  {msg.type === 'audio' && (
                    <div className="msg-audio">
                      <span>🎤</span>
                      <audio src={msg.mediaURL} controls />
                    </div>
                  )}
                  {msg.type === 'call' && (
                    <div className="msg-call">
                      <span className="msg-call-icon">
                        {msg.callStatus === 'missed' ? '📵' : msg.callType === 'video' ? '📹' : '📞'}
                      </span>
                      <span className="msg-call-text">{msg.text}</span>
                    </div>
                  )}
                  <div className="msg-meta">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {msg.senderId === user.uid && (
                      <span className={`msg-status ${msg.status}`}>{getStatusIcon(msg.status)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {editingMsg && (
        <div className="edit-bar">
          <span>✏️ Editing message</span>
          <div className="edit-bar-actions">
            <input
              className="edit-input"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditMessage()}
              autoFocus
            />
            <button className="edit-save-btn" onClick={handleEditMessage}>Save</button>
            <button className="edit-cancel-btn" onClick={() => { setEditingMsg(null); setEditText('') }}>✕</button>
          </div>
        </div>
      )}

      <form className="msg-input-bar" onSubmit={handleSendText}>
        <div className="media-menu-wrap">
          <button type="button" className="media-menu-btn" onClick={(e) => { e.stopPropagation(); setShowMediaMenu(v => !v); setShowEmoji(false) }} />
          {showMediaMenu && (
            <div className="media-menu" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false) }}>🖼️ Image</button>
              <button type="button" onClick={() => { videoInputRef.current?.click(); setShowMediaMenu(false) }}>🎬 Video</button>
            </div>
          )}
        </div>

        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'video')} />

        {/* Emoji button */}
        <div className="emoji-btn-wrap" style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            className="emoji-trigger-btn"
            onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v); setShowMediaMenu(false) }}
          >
            😊
          </button>
          {showEmoji && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>

        <textarea
          ref={textareaRef}
          className="msg-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${otherUser.username}…`}
          rows={1}
          maxLength={2000}
        />
        <button type="submit" className={`send-btn ${text.trim() ? 'active' : ''}`} disabled={!text.trim() || sending} />
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
