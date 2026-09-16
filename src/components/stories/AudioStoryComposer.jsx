import { useState } from 'react'
import AudioRecorder from '../chat/AudioRecorder.jsx'
import { uploadStory } from '../../services/storiesService.js'
import toast from 'react-hot-toast'

const AudioStoryComposer = ({ userId, onClose, onPosted }) => {
  const [posting, setPosting] = useState(false)

  const handleSend = async (audioBlob) => {
    setPosting(true)
    try {
      const file = new File([audioBlob], `status_${Date.now()}.webm`, { type: 'audio/webm' })
      await uploadStory(userId, file, 'audio')
      toast.success('Audio status posted! 🎤')
      onPosted()
    } catch (err) {
      toast.error(err.message || 'Failed to post audio status.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="text-story-composer">
      <button className="text-story-close" onClick={onClose}>✕</button>
      <div className="text-story-preview" style={{ background: 'linear-gradient(135deg, #6C4DFF, #00E5FF)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎤</div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {posting ? 'Posting…' : 'Record your audio status'}
          </p>
        </div>
      </div>
      <AudioRecorder onSend={handleSend} onCancel={onClose} />
    </div>
  )
}

export default AudioStoryComposer
