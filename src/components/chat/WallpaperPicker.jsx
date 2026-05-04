import { useState, useRef } from 'react'
import { PRESET_WALLPAPERS, saveWallpaper, uploadCustomWallpaper } from '../../services/wallpaperService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import toast from 'react-hot-toast'

const WallpaperPicker = ({ currentWallpaper, onClose, onWallpaperChange }) => {
  const { user } = useAuth()
  const [selected, setSelected] = useState(currentWallpaper?.id || 'default')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleSelect = async (wallpaper) => {
    setSelected(wallpaper.id)
    try {
      await saveWallpaper(user.uid, wallpaper)
      onWallpaperChange(wallpaper)
      toast.success('Wallpaper updated! 🎨')
    } catch (err) {
      toast.error('Failed to save wallpaper')
    }
  }

  const handleCustomUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const wallpaper = await uploadCustomWallpaper(user.uid, file)
      setSelected('custom')
      onWallpaperChange(wallpaper)
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
            <button
              key={wp.id}
              className={`wallpaper-item ${selected === wp.id ? 'selected' : ''}`}
              onClick={() => handleSelect(wp)}
            >
              <div
                className="wallpaper-preview"
                style={wp.type === 'image' ? { backgroundImage: `url(${wp.value})`, backgroundSize: 'cover' } : { background: wp.value }}
              />
              <span className="wallpaper-name">{wp.name}</span>
              {selected === wp.id && <div className="wallpaper-check">✓</div>}
            </button>
          ))}

          <label className={`wallpaper-item custom-upload ${uploading ? 'uploading' : ''}`}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleCustomUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <div className="wallpaper-preview custom-preview">
              {uploading ? '⏳' : '📷'}
            </div>
            <span className="wallpaper-name">{uploading ? 'Uploading...' : 'Custom'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default WallpaperPicker
