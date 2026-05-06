import { useState } from 'react'
import { useStories } from '../../hooks/useStories.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { uploadStory } from '../../services/storiesService.js'
import StoryViewer from './StoryViewer.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const StoriesBar = () => {
  const { user, userProfile } = useAuth()
  const { storiesByUser, loading } = useStories()
  const [viewingStories, setViewingStories] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleAddStory = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const type = file.type.startsWith('image') ? 'image' : 'video'
    try {
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
      <div className="stories-bar">
        {/* My story — tap to view if exists, tap + to add */}
        <div className="my-story-wrap">
          {myStoryGroup ? (
            <button
              className="story-item"
              onClick={() => setViewingStories(myStoryGroup)}
            >
              <div className="story-circle has-story">
                <UserAvatar user={userProfile} size={48} />
              </div>
              <span className="story-label">My story</span>
            </button>
          ) : null}
          <label className="story-add-btn" title={uploading ? 'Uploading…' : 'Add story'}>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleAddStory}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <div className="story-circle add-story">
              {!myStoryGroup && <UserAvatar user={userProfile} size={48} />}
              {myStoryGroup && <span style={{fontSize:'1.4rem'}}>➕</span>}
              <div className="add-story-plus">{uploading ? '…' : '+'}</div>
            </div>
            {!myStoryGroup && <span className="story-label">Add story</span>}
          </label>
        </div>

        {/* Others stories */}
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="story-item skeleton">
              <div className="story-circle skeleton-circle" />
              <div className="story-label skeleton-label" />
            </div>
          ))
        ) : (
          othersStories.map(({ user: storyUser, stories }) => (
            <button
              key={storyUser.uid}
              className="story-item"
              onClick={() => setViewingStories({ user: storyUser, stories })}
            >
              <div className="story-circle has-story">
                <UserAvatar user={storyUser} size={48} />
              </div>
              <span className="story-label">{storyUser.username?.slice(0, 9) || 'User'}</span>
            </button>
          ))
        )}
      </div>

      {viewingStories && (
        <StoryViewer
          storyGroup={viewingStories}
          currentUserId={user.uid}
          onClose={() => setViewingStories(null)}
        />
      )}
    </>
  )
}

export default StoriesBar
