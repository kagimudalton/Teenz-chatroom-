import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStories } from '../../hooks/useStories.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { uploadStory } from '../../services/storiesService.js'
import { checkImageNSFW } from '../../services/moderationService.js'
import StoryViewer from './StoryViewer.jsx'
import TextStoryComposer from './TextStoryComposer.jsx'
import AudioStoryComposer from './AudioStoryComposer.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const StoriesBar = () => {
  const { user, userProfile } = useAuth()
  const { storiesByUser, loading } = useStories()
  const [viewingStories, setViewingStories] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState(null)
  const [showTextComposer, setShowTextComposer] = useState(false)
  const [showAudioComposer, setShowAudioComposer] = useState(false)
  const fabRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const handleOpenMenu = (e) => {
    e.stopPropagation()
    if (!showAddMenu && fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect()
      setMenuPosition({ left: rect.left, top: rect.top })
    }
    setShowAddMenu(v => !v)
  }

  const handleAddStory = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const type = file.type.startsWith('image') ? 'image' : 'video'
    try {
      if (type === 'image') {
        const { flagged } = await checkImageNSFW(file)
        if (flagged) {
          toast.error("This image can't be posted — it looks like it may contain explicit content.")
          return
        }
      }
      await uploadStory(user.uid, file, type)
      toast.success('Story posted! 🔥')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const myStoryGroup = storiesByUser.find(g => g.user.uid === user.uid)
  const othersStories = storiesByUser.filter(g => g.user.uid !== user.uid)

  return (
    <>
      <div className="stories-bar" onClick={() => setShowAddMenu(false)}>
        {/* My story */}
        <div className="story-item-wrap">
          <button
            className="story-item"
            onClick={() => myStoryGroup && setViewingStories(myStoryGroup)}
          >
            <div className={`story-circle ${myStoryGroup ? 'has-story' : 'no-story'}`}>
              <UserAvatar user={userProfile} size={46} />
            </div>
            <span className="story-label">My story</span>
          </button>
          {/* Small FAB add button */}
          <div style={{ position: 'relative' }}>
            <button
              ref={fabRef}
              className="story-add-fab"
              title={uploading ? 'Uploading…' : 'Add story'}
              onClick={handleOpenMenu}
              disabled={uploading}
            >
              {uploading ? '⏳' : '+'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={(e) => { setShowAddMenu(false); handleAddStory(e) }} style={{ display: 'none' }} />
            <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => { setShowAddMenu(false); handleAddStory(e) }} style={{ display: 'none' }} />
            {showAddMenu && menuPosition && createPortal(
              <>
                <div className="story-add-menu-backdrop" onClick={() => setShowAddMenu(false)} />
                <div
                  className="story-add-menu story-add-menu-portal"
                  style={{ left: menuPosition.left, top: menuPosition.top }}
                  onClick={e => e.stopPropagation()}
                >
                  <button className="story-add-menu-item" onClick={() => { setShowAddMenu(false); photoInputRef.current?.click() }}>
                    📷 Photo status
                  </button>
                  <button className="story-add-menu-item" onClick={() => { setShowAddMenu(false); videoInputRef.current?.click() }}>
                    🎥 Video status
                  </button>
                  <button className="story-add-menu-item" onClick={() => { setShowAddMenu(false); setShowTextComposer(true) }}>
                    ✏️ Text status
                  </button>
                  <button className="story-add-menu-item" onClick={() => { setShowAddMenu(false); setShowAudioComposer(true) }}>
                    🎤 Audio status
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Others stories */}
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="story-item skeleton">
              <div className="story-circle skeleton-circle" style={{ width: 50, height: 50 }} />
              <div className="story-label skeleton-label" />
            </div>
          ))
        ) : (
          othersStories.map(({ user: storyUser, stories }) => (
            <button key={storyUser.uid} className="story-item" onClick={() => setViewingStories({ user: storyUser, stories })}>
              <div className="story-circle has-story">
                <UserAvatar user={storyUser} size={46} />
              </div>
              <span className="story-label">{storyUser.username?.slice(0, 8) || 'User'}</span>
            </button>
          ))
        )}
      </div>

      {viewingStories && (
        <StoryViewer storyGroup={viewingStories} currentUserId={user.uid} onClose={() => setViewingStories(null)} />
      )}

      {showTextComposer && (
        <TextStoryComposer
          userId={user.uid}
          onClose={() => setShowTextComposer(false)}
          onPosted={() => setShowTextComposer(false)}
        />
      )}

      {showAudioComposer && (
        <AudioStoryComposer
          userId={user.uid}
          onClose={() => setShowAudioComposer(false)}
          onPosted={() => setShowAudioComposer(false)}
        />
      )}
    </>
  )
}

export default StoriesBar
