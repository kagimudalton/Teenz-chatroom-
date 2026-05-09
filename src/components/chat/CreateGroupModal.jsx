import { useState, useRef } from 'react'
import { searchUsers } from '../../services/chatService.js'
import { createGroup } from '../../services/groupService.js'
import { useAuth } from '../../features/auth/AuthContext.jsx'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
  const { user, userProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupPhoto, setGroupPhoto] = useState(null)
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(null)
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef(null)

  const handleSearch = async (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.length < 2) { setSearchResults([]); return }
    const results = await searchUsers(val, user.uid)
    setSearchResults(results)
  }

  const toggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.find(m => m.uid === member.uid)
        ? prev.filter(m => m.uid !== member.uid)
        : [...prev, member]
    )
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setGroupPhoto(file)
    setGroupPhotoPreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return }
    if (selectedMembers.length < 1) { toast.error('Add at least 1 member'); return }
    setCreating(true)
    try {
      const groupId = await createGroup(
        user.uid,
        groupName,
        selectedMembers.map(m => m.uid),
        groupPhoto
      )
      toast.success(`Group "${groupName}" created! 🎉`)
      onGroupCreated(groupId)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 New Group</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <div className="group-create-content">
            <p style={{ padding: '12px 20px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select members to add to the group
            </p>
            <input
              className="search-input"
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search users..."
              autoFocus
            />

            {/* Selected members */}
            {selectedMembers.length > 0 && (
              <div className="selected-members">
                {selectedMembers.map(m => (
                  <div key={m.uid} className="selected-member-chip">
                    <UserAvatar user={m} size={24} />
                    <span>{m.username}</span>
                    <button onClick={() => toggleMember(m)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="search-results">
              {searchResults.map(u => (
                <button
                  key={u.uid}
                  className={`search-result-item ${selectedMembers.find(m => m.uid === u.uid) ? 'selected-result' : ''}`}
                  onClick={() => toggleMember(u)}
                >
                  <UserAvatar user={u} size={42} />
                  <div className="result-info">
                    <span className="result-name">{u.username}</span>
                    {u.bio && <span className="result-bio">{u.bio}</span>}
                  </div>
                  {selectedMembers.find(m => m.uid === u.uid) && <span style={{ color: 'var(--accent-purple)' }}>✓</span>}
                </button>
              ))}
            </div>

            {selectedMembers.length > 0 && (
              <div style={{ padding: '12px 16px' }}>
                <button className="auth-submit-btn" onClick={() => setStep(2)}>
                  Next ({selectedMembers.length} selected) →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="group-create-content" style={{ padding: '20px' }}>
            {/* Group photo */}
            <div className="profile-avatar-section">
              <label style={{ cursor: 'pointer' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {groupPhotoPreview
                    ? <img src={groupPhotoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '2rem' }}>📷</span>
                  }
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Group photo (optional)</p>
            </div>

            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                maxLength={50}
                autoFocus
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                {selectedMembers.length + 1} members including you
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedMembers.map(m => (
                  <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    <UserAvatar user={m} size={20} />
                    <span style={{ fontSize: '0.8rem' }}>{m.username}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="auth-submit-btn" onClick={handleCreate} disabled={creating}>
                {creating ? <span className="btn-spinner" /> : 'Create Group 🎉'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateGroupModal
