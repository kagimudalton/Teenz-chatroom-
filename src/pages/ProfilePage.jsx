import { useState, useRef } from 'react'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase.js'
import { uploadAvatar } from '../services/cloudinaryService.js'
import { updateProfile } from 'firebase/auth'
import { auth } from '../services/firebase.js'
import UserAvatar from '../components/ui/UserAvatar.jsx'
import AccountSwitcher from '../components/chat/AccountSwitcher.jsx'
import SecuritySettings from '../components/chat/SecuritySettings.jsx'
import toast from 'react-hot-toast'

const ProfilePage = ({ onClose }) => {
  const { user, userProfile, refreshProfile } = useAuth()
  const [username, setUsername] = useState(userProfile?.username || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [showLastSeen, setShowLastSeen] = useState(userProfile?.showLastSeen !== false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleSave = async () => {
    if (!username.trim()) { toast.error('Username cannot be empty'); return }
    if (username.length < 3) { toast.error('Username must be at least 3 characters'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        bio: bio.trim(),
        showLastSeen,
      })
      await updateProfile(auth.currentUser, { displayName: username.trim() })
      await refreshProfile()
      toast.success('Profile updated! ✅')
      onClose()
    } catch (err) {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const photoURL = await uploadAvatar(file)
      await updateDoc(doc(db, 'users', user.uid), { photoURL })
      await updateProfile(auth.currentUser, { photoURL })
      await refreshProfile()
      toast.success('Profile photo updated! 📸')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-content">
          {/* Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrap">
              <UserAvatar user={userProfile} size={90} showViewer={true} />
              <button
                className="change-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '⏳' : '📷'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            <p className="profile-email">{user?.email}</p>
          </div>

          {/* Username */}
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
              maxLength={20}
            />
            <span className="form-hint">{username.length}/20 chars</span>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label>Bio</label>
            <textarea
              className="bio-input"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              maxLength={100}
              rows={3}
            />
            <span className="form-hint">{bio.length}/100 chars</span>
          </div>

          {/* Privacy */}
          <div className="profile-privacy">
            <h3>Privacy</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showLastSeen}
                onChange={e => setShowLastSeen(e.target.checked)}
              />
              <span className="checkmark" />
              Show last seen to others
            </label>
          </div>

          {/* Accounts */}
          <AccountSwitcher />

          {/* Security */}
          <SecuritySettings />

          {/* Save */}
          <button
            className="auth-submit-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="btn-spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
