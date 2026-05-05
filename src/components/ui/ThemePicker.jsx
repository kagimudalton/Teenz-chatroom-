import { useState } from 'react'
import { PRESET_THEMES, saveTheme } from '../../services/themeService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import toast from 'react-hot-toast'

const ThemePicker = ({ onClose }) => {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (theme) => {
    setSelected(theme.id)
    setSaving(true)
    try {
      await saveTheme(user.uid, theme)
      toast.success(`${theme.name} theme applied! 🎨`)
    } catch (err) {
      toast.error('Failed to save theme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎨 App Theme</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ padding: '12px 20px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Changes the entire app color — saved to your account!
        </p>
        <div className="theme-grid">
          {PRESET_THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`theme-item ${selected === theme.id ? 'selected' : ''}`}
              onClick={() => handleSelect(theme)}
              disabled={saving}
            >
              <div
                className="theme-preview"
                style={{ background: theme.bg }}
              >
                <div className="theme-bubble" style={{ background: theme.primary }} />
                <div className="theme-bubble-sm" style={{ background: theme.secondary }} />
              </div>
              <span className="theme-name">{theme.name}</span>
              {selected === theme.id && <div className="wallpaper-check">✓</div>}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 20px' }}>
          <button className="auth-submit-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

export default ThemePicker
