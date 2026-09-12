import { useState, useEffect } from 'react'
import { getMemberProfiles, removeGroupMember, promoteToAdmin, demoteFromAdmin, addGroupMember, leaveGroup } from '../../services/groupService.js'
import { searchUsers } from '../../services/chatService.js'
import UserAvatar from '../ui/UserAvatar.jsx'
import toast from 'react-hot-toast'

const GroupInfoModal = ({ group, currentUserId, onClose, onLeft }) => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const isAdmin = (group.admins || []).includes(currentUserId)

  useEffect(() => {
    loadMembers()
  }, [group.members, group.admins])

  const loadMembers = async () => {
    setLoading(true)
    const profiles = await getMemberProfiles(group.members || [])
    setMembers(profiles)
    setLoading(false)
  }

  const handleSearch = async (term) => {
    setSearchTerm(term)
    if (term.length < 2) { setSearchResults([]); return }
    const results = await searchUsers(term, currentUserId)
    setSearchResults(results.filter(r => !(group.members || []).includes(r.uid)))
  }

  const handleAddMember = async (userId) => {
    try {
      await addGroupMember(group.id, userId)
      toast.success('Member added!')
      setShowAddMember(false)
      setSearchTerm('')
      setSearchResults([])
      loadMembers()
    } catch {
      toast.error('Failed to add member')
    }
  }

  const handleRemoveMember = async (userId, username) => {
    try {
      await removeGroupMember(group.id, userId)
      toast.success(`Removed ${username}`)
      loadMembers()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleToggleAdmin = async (userId, isCurrentlyAdmin) => {
    try {
      await (isCurrentlyAdmin ? demoteFromAdmin : promoteToAdmin)(group.id, userId)
      toast.success(isCurrentlyAdmin ? 'Removed as admin' : 'Made admin')
      loadMembers()
    } catch {
      toast.error('Failed to update admin status')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveGroup(group.id, currentUserId)
      toast.success('Left group')
      onLeft?.()
      onClose()
    } catch {
      toast.error('Failed to leave group')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Group info</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="group-info-header">
          {group.photoURL ? (
            <img src={group.photoURL} className="group-info-photo" />
          ) : (
            <div className="group-info-photo-fallback">👥</div>
          )}
          <h3>{group.name}</h3>
          <p>{members.length} members</p>
        </div>

        {isAdmin && (
          <button className="add-account-btn" onClick={() => setShowAddMember(v => !v)}>
            {showAddMember ? '✕ Cancel' : '+ Add member'}
          </button>
        )}

        {showAddMember && (
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              className="lock-pin-input"
              style={{ letterSpacing: 'normal', fontSize: '0.9rem', textAlign: 'left' }}
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {searchResults.map(res => (
              <button key={res.uid} className="search-result-item" onClick={() => handleAddMember(res.uid)}>
                <UserAvatar user={res} size={38} />
                <div className="result-info">
                  <span className="result-name">{res.username}</span>
                </div>
                <span className="result-action">+ Add</span>
              </button>
            ))}
          </div>
        )}

        <h3 style={{ marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Members</h3>
        {loading ? (
          <p className="account-switcher-email">Loading…</p>
        ) : (
          <div className="account-switcher-list">
            {members.map(member => {
              const memberIsAdmin = (group.admins || []).includes(member.uid)
              return (
                <div key={member.uid} className="account-switcher-item" style={{ cursor: 'default' }}>
                  <UserAvatar user={member} size={42} />
                  <div className="account-switcher-info">
                    <span className="account-switcher-name">
                      {member.username} {member.uid === currentUserId && '(You)'}
                    </span>
                    {memberIsAdmin && <span className="account-switcher-email">Admin</span>}
                  </div>
                  {isAdmin && member.uid !== currentUserId && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="account-switcher-remove"
                        style={{ width: 'auto', borderRadius: 8, padding: '0 8px', fontSize: '0.72rem' }}
                        onClick={() => handleToggleAdmin(member.uid, memberIsAdmin)}
                      >
                        {memberIsAdmin ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        className="account-switcher-remove"
                        onClick={() => handleRemoveMember(member.uid, member.username)}
                        title="Remove"
                      >✕</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button className="report-reason-cancel" style={{ marginTop: 16, color: '#ff6b6b' }} onClick={handleLeave}>
          🚪 Leave group
        </button>
      </div>
    </div>
  )
}

export default GroupInfoModal
