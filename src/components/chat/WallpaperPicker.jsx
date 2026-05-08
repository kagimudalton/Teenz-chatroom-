import { useState, useRef } from 'react'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import { uploadToCloudinary } from '../../services/cloudinaryService.js'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase.js'
import toast from 'react-hot-toast'

export const PRESET_WALLPAPERS = [
  { id: 'default', name: 'Default', type: 'gradient', value: 'linear-gradient(135deg, #0F0C29, #302B63, #24243E)' },
  { id: 'midnight', name: 'Midnight', type: 'gradient', value: 'linear-gradient(135deg, #000000, #1a1a2e, #16213e)' },
  { id: 'ocean', name: 'Ocean', type: 'gradient', value: 'linear-gradient(135deg, #0077b6, #00b4d8, #90e0ef)' },
  { id: 'forest', name: 'Forest', type: 'gradient', value: 'linear-gradient(135deg, #1b4332, #2d6a4f, #52b788)' },
  { id: 'sunset', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #f77f00, #d62828, #7209b7)' },
  { id: 'candy', name: 'Candy', type: 'gradient', value: 'linear-gradient(135deg, #ff6b9d, #c44dff, #6b9dff)' },
  { id: 'dark', name: 'Pure Dark', type: 'solid', value: '#0a0a0a' },
  { id: 'navy', name: 'Navy', type: 'solid', value: '#0d1b2a' },
  { id: 'purple', name: 'Deep Purple', type: 'solid', value: '#1a0533' },
  { id: 'green', name: 'Dark Green', type: 'solid', value: '#0d2818' },
]

const WallpaperPicker = ({ currentWallpaper, onClose, onWallpaperChange }) => {
  const { user } = useAuth()
  const [selected, setSelected] = useState(currentWallpaper?.id || 'default')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleSelect = async (wp) => {
    setSelected(wp.id)
    try {
      await updateDoc(doc(db, 'users', user.uid), { wallpaper: wp })
      onWallpaperChange(wp)
      toast.success('Wallpaper set! 🎨')
    } catch (err) {
      toast.error('Failed to save wallpaper')
    }
  }

  const handleCustomUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'image')
      const wp = { id: 'custom_' + Date.now(), name: 'Custom', type: 'image', value: url }
      await updateDoc(doc(db, 'users', user.uid), { wallpaper: wp })
      setSelected(wp.id)
      onWallpaperChange(wp)
      toast.success('Custom wallpaper set! 🔥')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wallpaper-picker" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎨 Chat Wallpaper</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wallpaper-grid">
          {PRESET_WALLPAPERS.map((wp) => (
            <button key={wp.id} className={`wallpaper-item ${selected === wp.id ? 'selected' : ''}`} onClick={() => handleSelect(wp)}>
              <div className="wallpaper-preview" style={wp.type === 'image' ? { backgroundImage: `url(${wp.value})`, backgroundSize: 'cover' } : { background: wp.value }} />
              <span className="wallpaper-name">{wp.name}</span>
              {selected === wp.id && <div className="wallpaper-check">✓</div>}
            </button>
          ))}
          <label className={`wallpaper-item ${uploading ? 'uploading' : ''}`}>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleCustomUpload} disabled={uploading} style={{ display: 'none' }} />
            <div className="wallpaper-preview custom-preview">{uploading ? '⏳' : '📷'}</div>
            <span className="wallpaper-name">{uploading ? 'Uploading...' : 'Custom'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default WallpaperPicker
