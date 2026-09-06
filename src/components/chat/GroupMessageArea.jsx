import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { subscribeToGroupMessages, sendGroupMessage, sendGroupMediaMessage, sendGroupStickerMessage, leaveGroup } from '../../services/groupService.js'
import { formatTime, isEmojiOnly } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import FullscreenViewer from '../ui/FullscreenViewer.jsx'
import EmojiPicker from './EmojiPicker.jsx'
import StickerPicker, { getStickerById } from './StickerPicker.jsx'
import FormattingToolbar from './FormattingToolbar.jsx'
import FormattedText from './FormattedText.jsx'
import AudioRecorder from './AudioRecorder.jsx'
import VoiceMessagePlayer from './VoiceMessagePlayer.jsx'
import toast from 'react-hot-toast'

const GroupMessageArea = ({ group, onBackToSidebar, onExitChat }) => {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 })
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const [fullscreenMedia, setFullscreenMedia] = useState(null)
  const bottomRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!group?.id) return
    const unsubscribe = subscribeToGroupMessages(group.id, (msgs) => {
      setMessages(msgs)
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return () => unsubscribe()
  }, [group?.id])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const msgText = text
    setText('')
    setTextSelection({ start: 0, end: 0 })
    try {
      await sendGroupMessage(group.id, user.uid, userProfile?.username || 'User', msgText)
    } catch (err) {
      toast.error(err.message)
      setText(msgText)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
  }

  const handleTextSelect = (e) => {
    setTextSelection({ start: e.target.selectionStart, end: e.target.selectionEnd })
  }

  const handleFormat = (marker) => {
    const { start, end } = textSelection
    if (start === end) return
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)
    const newText = `${before}${marker}${selected}${marker}${after}`
    setText(newText)
    const newCursorPos = end + marker.length * 2
    setTextSelection({ start: 0, end: 0 })
    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.selectionStart = newCursorPos
        textarea.selectionEnd = newCursorPos
        textarea.focus()
      }
    }, 0)
  }

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  const handleMedia = async (file, type) => {
    setSending(true)
    setShowMediaMenu(false)
    try {
      await sendGroupMediaMessage(group.id, user.uid, userProfile?.username || 'User', file, type)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleStickerSelect = async (stickerId) => {
    setShowStickers(false)
    try {
      await sendGroupStickerMessage(group.id, user.uid, userProfile?.username || 'User', stickerId)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleVoiceNote = async (audioBlob) => {
    const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    setSending(true)
    setShowRecorder(false)
    try {
      await sendGroupMediaMessage(group.id, user.uid, userProfile?.username || 'User', file, 'audio')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return
    try {
      await leaveGroup(group.id, user.uid)
      toast.success('Left group')
      onBackToSidebar()
    } catch {
      toast.error('Failed to leave group')
    }
  }

  const groupedMessages = groupByDate(messages)

  return (
    <div className="message-area" onClick={() => { setShowEmoji(false); setShowMenu(false); setShowMediaMenu(false); setShowStickers(false) }}>
      {fullscreenMedia && (
        <FullscreenViewer mediaURL={fullscreenMedia.url} mediaType={fullscreenMedia.type} onClose={() => setFullscreenMedia(null)} />
      )}
      {/* Header */}
      <div className="msg-header">
        <button className="back-to-sidebar" onClick={onBackToSidebar} />
        <div className="msg-header-user">
          <div className="group-avatar-ring">
            {group.photoURL
              ? <img src={group.photoURL} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setFullscreenMedia({ url: group.photoURL, type: 'image' }) }} />
              : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👥</div>
            }
          </div>
          <div>
            <div className="msg-header-name">{group.name}</div>
            <div className="msg-header-status">{group.members?.length} members</div>
          </div>
        </div>
        <div className="msg-header-actions">
          <button className="call-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }} title="More" />
          {onExitChat && (
            <button className="exit-chat-btn" onClick={(e) => { e.stopPropagation(); onExitChat() }} title="Close chat">✕</button>
          )}
        </div>
        {showMenu && (
          <div className="header-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={handleLeave}>🚪 Leave Group</button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        {loading ? <div className="messages-loading">Loading…</div>
          : messages.length === 0 ? <div className="messages-empty"><p>No messages yet!</p><p>Say hi to the group 👋</p></div>
          : groupedMessages.map((group) => (
            <div key={group.dateLabel}>
              <div className="date-separator"><span>{group.dateLabel}</span></div>
              {group.messages.map((msg) => {
                const isMine = msg.senderId === user.uid
                return (
                  <div key={msg.id} className={`msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                    <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'} ${msg.type}`}>
                      {!isMine && <div className="group-msg-sender">{msg.senderName}</div>}
                      {msg.type === 'text' && <p className={`msg-text ${isEmojiOnly(msg.text) ? 'emoji-only' : ''}`}><FormattedText text={msg.text} /></p>}
                      {msg.type === 'image' && <img src={msg.mediaURL} className="msg-image" loading="lazy" onClick={(e) => { e.stopPropagation(); setFullscreenMedia({ url: msg.mediaURL, type: 'image' }) }} />}
                      {msg.type === 'video' && <video src={msg.mediaURL} controls className="msg-video" preload="metadata" />}
                      {msg.type === 'audio' && <VoiceMessagePlayer mediaURL={msg.mediaURL} />}
                      {msg.type === 'sticker' && (
                        <div className="msg-sticker">
                          <span className={`sticker-display ${getStickerById(msg.stickerId).animClass}`}>
                            {getStickerById(msg.stickerId).emoji}
                          </span>
                        </div>
                      )}
                      <div className="msg-meta">
                        <span className="msg-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>

      {/* Audio recorder */}
      {showRecorder && (
        <AudioRecorder onSend={handleVoiceNote} onCancel={() => setShowRecorder(false)} />
      )}

      {/* Input */}
      {textSelection.end > textSelection.start && (
        <FormattingToolbar onFormat={handleFormat} />
      )}

      <form className="msg-input-bar" onSubmit={handleSend}>
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
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMedia(e.target.files[0], 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleMedia(e.target.files[0], 'video')} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" className="emoji-trigger-btn" onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v); setShowStickers(false) }}>😊</button>
          {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" className="emoji-trigger-btn" onClick={(e) => { e.stopPropagation(); setShowStickers(v => !v); setShowEmoji(false) }}>🎨</button>
          {showStickers && <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickers(false)} />}
        </div>
        <textarea
          ref={textareaRef}
          className="msg-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleTextSelect}
          placeholder={`Message ${group.name}…`}
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

export default GroupMessageArea
