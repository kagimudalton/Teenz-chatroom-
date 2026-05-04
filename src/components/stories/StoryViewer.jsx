import { useState, useEffect, useRef } from 'react'
import { recordStoryView, getStoryViewers } from '../../services/storiesService.js'
import { formatStoryExpiry } from '../../utils/helpers.js'
import UserAvatar from '../ui/UserAvatar.jsx'

const STORY_DURATION_MS = 5000

const StoryViewer = ({ storyGroup, currentUserId, onClose }) => {
  const { user: storyUser, stories } = storyGroup
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [viewers, setViewers] = useState(null)
  const [showViewers, setShowViewers] = useState(false)
  const progressRef = useRef(null)
  const currentStory = stories[currentIndex]
  const isOwner = currentUserId === storyUser.uid

  useEffect(() => {
    if (!currentStory) return
    recordStoryView(currentStory.storyId, currentUserId).catch(() => {})
    setProgress(0)
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

  const goNext = () => { if (currentIndex < stories.length - 1) setCurrentIndex(i => i + 1); else onClose() }
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1) }

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
        {currentStory.type === 'video' && <video src={currentStory.mediaURL} className="story-media" autoPlay muted playsInline onEnded={goNext} />}
        {currentStory.type === 'text' && (
          <div className="story-text-card" style={{ background: currentStory.backgroundColor || '#6C4DFF', color: currentStory.textColor || '#fff' }}>
            <p>{currentStory.text}</p>
          </div>
        )}
        {currentStory.caption && <div className="story-caption">{currentStory.caption}</div>}
      </div>
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
