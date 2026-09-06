import { useState, useRef, useEffect, useCallback } from 'react'
import { useMessages } from '../../hooks/useMessages.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { useWallpaper } from '../../hooks/useWallpaper.js'
import { sendTextMessage, sendMediaMessage, sendStickerMessage, editMessage, setTypingStatus, subscribeToTyping } from '../../services/chatService.js'
import { subscribeToUserStatus, formatLastSeen, reportUser } from '../../services/userService.js'
import { formatTime, getStatusIcon, isEmojiOnly } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import FullscreenViewer from '../ui/FullscreenViewer.jsx'
import WallpaperPicker from './WallpaperPicker.jsx'
import EmojiPicker from './EmojiPicker.jsx'
import StickerPicker, { getStickerById } from './StickerPicker.jsx'
import AudioRecorder from './AudioRecorder.jsx'
import VoiceMessagePlayer from './VoiceMessagePlayer.jsx'
import FormattedText from './FormattedText.jsx'
import MessageReactions from './MessageReactions.jsx'
import ForwardModal from './ForwardModal.jsx'
import toast from 'react-hot-toast'

const MessageArea = ({ conversationId, otherUser, onBackToSidebar, onStartCall, onExitChat }) => {
  const { user } = useAuth()
  const { messages, loading, bottomRef } = useMessages(conversationId)
  const { wallpaper, updateWallpaper } = useWallpaper()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showWallpaper, setShowWallpaper] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null })
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [forwardMsg, setForwardMsg] = useState(null)
  const [fullscreenMedia, setFullscreenMedia] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const textareaRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    if (!otherUser?.uid) return
    const unsubscribe = subscribeToUserStatus(otherUser.uid, setUserStatus)
    return () => unsubscribe()
  }, [otherUser?.uid])

  useEffect(() => {
    if (!conversationId) return
    const unsubscribe = subscribeToTyping(conversationId, (typing) => {
      setOtherTyping(!!typing[otherUser?.uid])
    })
    return () => unsubscribe()
  }, [conversationId, otherUser?.uid])

  // Apply wallpaper directly to DOM
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !wallpaper) return
    if (wallpaper.id === 'default') {
      container.style.background = ''
      container.style.backgroundImage = ''
      return
    }
    if (wallpaper.type === 'image') {
      container.style.backgroundImage = `url(${wallpaper.value})`
      container.style.backgroundSize = 'cover'
      container.style.backgroundPosition = 'center'
      container.style.backgroundRepeat = 'no-repeat'
    } else {
      container.style.background = wallpaper.value
      container.style.backgroundImage = ''
    }
  }, [wallpaper])

  const handleTyping = (e) => {
    setText(e.target.value)
    setTypingStatus(conversationId, user.uid, true).catch(() => {})
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(conversationId, user.uid, false).catch(() => {})
    }, 2000)
  }

  const handleSendText = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const msgText = text
    setText('')
    setReplyingTo(null)
    setTypingStatus(conversationId, user.uid, false).catch(() => {})
    try {
      await sendTextMessage(conversationId, user.uid, otherUser.uid, msgText, replyingTo)
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
    setShowEmoji(false)
  }

  const handleStickerSelect = async (stickerId) => {
    setShowStickers(false)
    try {
      await sendStickerMessage(conversationId, user.uid, otherUser.uid, stickerId)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleMediaUpload = async (file, type) => {
    setSending(true)
    setShowMediaMenu(false)
    const activeReply = replyingTo
    setReplyingTo(null)
    try {
      await sendMediaMessage(conversationId, user.uid, otherUser.uid, file, type, null, activeReply)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleVoiceNote = async (audioBlob) => {
    const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    setSending(true)
    setShowRecorder(false)
    const activeReply = replyingTo
    setReplyingTo(null)
    try {
      await sendMediaMessage(conversationId, user.uid, otherUser.uid, file, 'audio', null, activeReply)
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

  const handleLongPress = (msg) => {
    setContextMenu(msg)
  }

  const statusText = userStatus.isOnline
    ? otherTyping ? '✍️ typing...' : 'Online'
    : formatLastSeen(userStatus.lastSeen)

  const groupedMessages = groupByDate(messages)

  return (
    <div className="message-area" onClick={() => { setShowMediaMenu(false); setShowMenu(false); setShowEmoji(false); setShowStickers(false); setContextMenu(null) }}>
      {fullscreenMedia && (
        <FullscreenViewer mediaURL={fullscreenMedia.url} mediaType={fullscreenMedia.type} onClose={() => setFullscreenMedia(null)} />
      )}

      {showWallpaper && (
        <WallpaperPicker currentWallpaper={wallpaper} onClose={() => setShowWallpaper(false)} onWallpaperChange={(wp) => { updateWallpaper(wp) }} />
      )}

      {forwardMsg && (
        <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div className="msg-context-menu" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReplyingTo(contextMenu); setContextMenu(null) }}>↩️ Reply</button>
          {contextMenu.senderId === user.uid && contextMenu.type === 'text' && (
            <button onClick={() => { setEditingMsg(contextMenu); setEditText(contextMenu.text); setContextMenu(null) }}>✏️ Edit</button>
          )}
          <button onClick={() => { setForwardMsg(contextMenu); setContextMenu(null) }}>↗️ Forward</button>
          <button onClick={() => setContextMenu(null)}>✕ Close</button>
        </div>
      )}

      {/* Header */}
      <div className="msg-header">
        <button className="back-to-sidebar" onClick={onBackToSidebar} />
        <div className="msg-header-user">
          <UserAvatar user={otherUser} size={38} showViewer={true} />
          <div>
            <div className="msg-header-name">{otherUser.username}</div>
            <div className={`msg-header-status ${userStatus.isOnline ? 'online' : ''} ${otherTyping ? 'typing' : ''}`}>
              {statusText}
            </div>
          </div>
        </div>
        <div className="msg-header-actions">
          <button className="call-btn audio" onClick={() => onStartCall('audio')} title="Voice call" />
          <button className="call-btn video" onClick={() => onStartCall('video')} title="Video call" />
          <button className="call-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }} title="More" />
          {onExitChat && (
            <button className="exit-chat-btn" onClick={(e) => { e.stopPropagation(); onExitChat() }} title="Close chat">✕</button>
          )}
        </div>
        {showMenu && (
          <div className="header-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowWallpaper(true); setShowMenu(false) }}>🎨 Wallpaper</button>
            <button onClick={handleReport}>🚩 Report</button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="messages-container">
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
              <div
                key={msg.id}
                className={`msg-bubble-wrap ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(msg) }}
              >
                {msg.replyTo && (
                  <div className="reply-preview">
                    <span>↩️ {msg.replyTo.text || `📎 ${msg.replyTo.type}`}</span>
                  </div>
                )}
                {msg.forwarded && (
                  <div className="forwarded-label">↗️ Forwarded</div>
                )}
                <div className={`msg-bubble ${msg.senderId === user.uid ? 'mine' : 'theirs'} ${msg.type}`}>
                  {msg.type === 'text' && (
                    <p className={`msg-text ${isEmojiOnly(msg.text) ? 'emoji-only' : ''}`}>
                      <FormattedText text={msg.text} />
                      {msg.edited && <span className="msg-edited"> (edited)</span>}
                    </p>
                  )}
                  {msg.type === 'image' && (
                    <img src={msg.mediaURL} alt="Shared" className="msg-image" loading="lazy" onClick={(e) => { e.stopPropagation(); setFullscreenMedia({ url: msg.mediaURL, type: 'image' }) }} />
                  )}
                  {msg.type === 'video' && (
                    <video src={msg.mediaURL} controls className="msg-video" preload="metadata" />
                  )}
                  {msg.type === 'audio' && (
                    <VoiceMessagePlayer mediaURL={msg.mediaURL} />
                  )}
                  {msg.type === 'sticker' && (
                    <div className="msg-sticker">
                      <span className={`sticker-display ${getStickerById(msg.stickerId).animClass}`}>
                        {getStickerById(msg.stickerId).emoji}
                      </span>
                    </div>
                  )}
                  {msg.type === 'call' && (
                    <div className="msg-call">
                      <span className="msg-call-icon">{msg.callStatus === 'missed' ? '📵' : msg.callType === 'video' ? '📹' : '📞'}</span>
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
                <MessageReactions message={msg} conversationId={conversationId} />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <span className="reply-bar-label">↩️ Replying to</span>
            <span className="reply-bar-text">{replyingTo.type === 'text' ? replyingTo.text?.slice(0, 50) : `📎 ${replyingTo.type}`}</span>
          </div>
          <button className="reply-bar-close" onClick={() => setReplyingTo(null)}>✕</button>
        </div>
      )}

      {/* Edit bar */}
      {editingMsg && (
        <div className="edit-bar">
          <span>✏️ Editing message</span>
          <div className="edit-bar-actions">
            <input className="edit-input" value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditMessage()} autoFocus />
            <button className="edit-save-btn" onClick={handleEditMessage}>Save</button>
            <button className="edit-cancel-btn" onClick={() => { setEditingMsg(null); setEditText('') }}>✕</button>
          </div>
        </div>
      )}

      {/* Audio recorder */}
      {showRecorder && (
        <AudioRecorder onSend={handleVoiceNote} onCancel={() => setShowRecorder(false)} />
      )}

      {/* Input bar */}
      <form className="msg-input-bar" onSubmit={handleSendText}>
        <div className="media-menu-wrap">
          <button type="button" className="media-menu-btn" onClick={(e) => { e.stopPropagation(); setShowMediaMenu(v => !v); setShowEmoji(false) }} />
          {showMediaMenu && (
            <div className="media-menu" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false) }}>🖼️ Image</button>
              <button type="button" onClick={() => { videoInputRef.current?.click(); setShowMediaMenu(false) }}>🎬 Video</button>
              <button type="button" onClick={() => { setShowRecorder(true); setShowMediaMenu(false) }}>🎤 Voice note</button>
            </div>
          )}
        </div>
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMediaUpload(e.target.files[0], 'video')} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" className="emoji-trigger-btn" onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v); setShowMediaMenu(false); setShowStickers(false) }}>😊</button>
          {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" className="emoji-trigger-btn" onClick={(e) => { e.stopPropagation(); setShowStickers(v => !v); setShowMediaMenu(false); setShowEmoji(false) }}>🎨</button>
          {showStickers && <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickers(false)} />}
        </div>
        <textarea ref={textareaRef} className="msg-input" value={text} onChange={handleTyping} onKeyDown={handleKeyDown} placeholder={`Message ${otherUser.username}…`} rows={1} maxLength={2000} />
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
