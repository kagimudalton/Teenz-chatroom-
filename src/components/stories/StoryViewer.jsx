import { useState, useEffect, useRef } from 'react'
import { recordStoryView, getStoryViewers } from '../../services/storiesService.js'
import { getOrCreateConversation, sendTextMessage } from '../../services/chatService.js'
import { formatStoryExpiry } from '../../utils/helpers.js'
import { STORY_BACKGROUNDS } from './TextStoryComposer.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const STORY_DURATION_MS = 5000

const StoryViewer = ({ storyGroup, currentUserId, onClose }) => {
  const { user: storyUser, stories } = storyGroup
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [viewers, setViewers] = useState(null)
  const [showViewers, setShowViewers] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const progressRef = useRef(null)
  const videoRef = useRef(null)
  const currentStory = stories[currentIndex]
  const isOwner = currentUserId === storyUser.uid

  useEffect(() => {
    if (!currentStory) return
    recordStoryView(currentStory.storyId, currentUserId).catch(() => {})
    setProgress(0)

    if (currentStory.type === 'video') return

    const startTime = Date.now()
    progressRef.current = setInterval(() => {
      if (paused) return
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100)
      setProgress(pct)
      if (pct >= 100) goNext()
    }, 50)
    return () => clearInterval(progressRef.current)
  }, [currentIndex, paused])

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100
    setProgress(pct)
  }

  const goNext = () => {
    clearInterval(progressRef.current)
    if (currentIndex < stories.length - 1) setCurrentIndex(i => i + 1)
    else onClose()
  }

  const goPrev = () => {
    clearInterval(progressRef.current)
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  const handleTap = (e) => {
    const x = e.clientX
    const width = window.innerWidth
    if (x < width / 3) goPrev(); else goNext()
  }

  const handleViewers = async () => {
    if (!isOwner) return
    setShowViewers(true)
    setPaused(true)
    try {
      const list = await getStoryViewers(currentStory.storyId, currentUserId, storyUser.uid)
      setViewers(list)
    } catch { setViewers([]) }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const conversationId = await getOrCreateConversation(currentUserId, storyUser.uid)
      const prefix = currentStory.type === 'text'
        ? `Replied to your status "${(currentStory.text || '').slice(0, 40)}": `
        : 'Replied to your status: '
      await sendTextMessage(conversationId, currentUserId, storyUser.uid, prefix + replyText.trim())
      toast.success('Reply sent!')
      setReplyText('')
    } catch (err) {
      toast.error('Failed to send reply.')
    } finally {
      setSendingReply(false)
    }
  }

  if (!currentStory) return null

  return (
    <div className="story-viewer" onClick={handleTap}>
      <div className="story-progress-bars">
        {stories.map((_, i) => (
          <div key={i} className="story-progress-track">
            <div className="story-progress-fill" style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      <div className="story-header" onClick={e => e.stopPropagation()}>
        <div className="story-user-info">
          <UserAvatar user={storyUser} size={36} />
          <div>
            <span className="story-username">{storyUser.username}</span>
            <span className="story-expiry">{formatStoryExpiry(currentStory.expiresAt)}</span>
          </div>
        </div>
        <div className="story-header-actions">
          {isOwner && <button className="viewers-btn" onClick={handleViewers}>👁️ {currentStory.viewerCount || 0}</button>}
          <button className="story-close-btn" onClick={(e) => { e.stopPropagation(); onClose() }}>✕</button>
        </div>
      </div>
      <div className="story-content">
        {currentStory.type === 'image' && <img src={currentStory.mediaURL} alt="Story" className="story-media" draggable={false} />}
        {currentStory.type === 'video' && (
          <video
            ref={videoRef}
            src={currentStory.mediaURL}
            className="story-media"
            autoPlay
            playsInline
            onEnded={goNext}
            onTimeUpdate={handleVideoTimeUpdate}
          />
        )}
        {currentStory.type === 'text' && (
          <div
            className="story-text-card"
            style={{ background: STORY_BACKGROUNDS.find(bg => bg.key === currentStory.background)?.css || currentStory.backgroundColor || '#6C4DFF' }}
          >
            <p>{currentStory.text}</p>
          </div>
        )}
        {currentStory.caption && <div className="story-caption">{currentStory.caption}</div>}
      </div>
      {!isOwner && !showViewers && (
        <form className="story-reply-bar" onClick={e => e.stopPropagation()} onSubmit={handleSendReply}>
          <input
            type="text"
            className="story-reply-input"
            placeholder={`Reply to ${storyUser.username}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => { if (!replyText) setPaused(false) }}
            maxLength={300}
          />
          <button type="submit" className="story-reply-send-btn" disabled={!replyText.trim() || sendingReply}>➤</button>
        </form>
      )}

      {showViewers && (
        <div className="viewers-panel" onClick={e => e.stopPropagation()}>
          <div className="viewers-panel-header">
            <h3>Viewers ({viewers?.length ?? '…'})</h3>
            <button onClick={() => { setShowViewers(false); setPaused(false) }}>✕</button>
          </div>
          <div className="viewers-list">
            {viewers === null && <div className="viewers-loading">Loading…</div>}
            {viewers?.length === 0 && <div className="viewers-empty">No viewers yet 👀</div>}
            {viewers?.map((v) => (
              <div key={v.uid} className="viewer-item">
                <UserAvatar user={v} size={36} />
                <span>{v.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryViewer
