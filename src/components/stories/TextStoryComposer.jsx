import { useState } from 'react'
import { postTextStory } from '../../services/storiesService.js'
import toast from 'react-hot-toast'

export const STORY_BACKGROUNDS = [
  { key: 'purple-cyan', css: 'linear-gradient(135deg, #6C4DFF, #00E5FF)' },
  { key: 'sunset', css: 'linear-gradient(135deg, #FF6B6B, #FFD93D)' },
  { key: 'forest', css: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { key: 'candy', css: 'linear-gradient(135deg, #FC5C7D, #6A82FB)' },
  { key: 'midnight', css: 'linear-gradient(135deg, #0F2027, #203A43, #2C5364)' },
  { key: 'peach', css: 'linear-gradient(135deg, #FFAFBD, #ffc3a0)' },
]

const TextStoryComposer = ({ userId, onClose, onPosted }) => {
  const [text, setText] = useState('')
  const [background, setBackground] = useState(STORY_BACKGROUNDS[0])
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      await postTextStory(userId, text, background.key)
      toast.success('Status posted! 🔥')
      onPosted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="text-story-composer">
      <button className="text-story-close" onClick={onClose}>✕</button>

      <div className="text-story-preview" style={{ background: background.css }}>
        <textarea
          className="text-story-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a status..."
          maxLength={200}
          autoFocus
        />
      </div>

      <div className="text-story-bg-picker">
        {STORY_BACKGROUNDS.map((bg) => (
          <button
            key={bg.key}
            className={`text-story-bg-swatch ${background.key === bg.key ? 'active' : ''}`}
            style={{ background: bg.css }}
            onClick={() => setBackground(bg)}
          />
        ))}
      </div>

      <button className="text-story-post-btn" onClick={handlePost} disabled={!text.trim() || posting}>
        {posting ? 'Posting…' : 'Post status'}
      </button>
    </div>
  )
}

export default TextStoryComposer
