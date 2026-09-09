import { useState } from 'react'
import { useStories } from '../../hooks/useStories.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { uploadStory } from '../../services/storiesService.js'
import { checkImageNSFW } from '../../services/moderationService.js'
import StoryViewer from './StoryViewer.jsx'
import TextStoryComposer from './TextStoryComposer.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const StoriesBar = () => {
  const { user, userProfile } = useAuth()
  const { storiesByUser, loading } = useStories()
  const [viewingStories, setViewingStories] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showTextComposer, setShowTextComposer] = useState(false)

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
              className="story-add-fab"
              title={uploading ? 'Uploading…' : 'Add story'}
              onClick={(e) => { e.stopPropagation(); setShowAddMenu(v => !v) }}
              disabled={uploading}
            >
              {uploading ? '⏳' : '+'}
            </button>
            {showAddMenu && (
              <div className="story-add-menu" onClick={e => e.stopPropagation()}>
                <label className="story-add-menu-item">
                  <input type="file" accept="image/*,video/*" onChange={(e) => { setShowAddMenu(false); handleAddStory(e) }} style={{ display: 'none' }} />
                  🖼️ Photo / Video
                </label>
                <button className="story-add-menu-item" onClick={() => { setShowAddMenu(false); setShowTextComposer(true) }}>
                  ✏️ Text status
                </button>
              </div>
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
    </>
  )
}

export default StoriesBar
