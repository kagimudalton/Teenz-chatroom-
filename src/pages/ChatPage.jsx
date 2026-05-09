import { useState, useEffect } from 'react'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { useConversations } from '../hooks/useConversations.js'
import { useGroups } from '../hooks/useGroups.js'
import { useCall } from '../hooks/useCall.js'
import { getUserDocument } from '../services/authService.js'
import ConversationList from '../components/chat/ConversationList.jsx'
import MessageArea from '../components/chat/MessageArea.jsx'
import GroupMessageArea from '../components/chat/GroupMessageArea.jsx'
import StoriesBar from '../components/stories/StoriesBar.jsx'
import NewChatModal from '../components/chat/NewChatModal.jsx'
import CreateGroupModal from '../components/chat/CreateGroupModal.jsx'
import UserAvatar from '../components/ui/UserAvatar.jsx'
import ThemePicker from '../components/ui/ThemePicker.jsx'
import CallModal from '../components/calls/CallModal.jsx'
import IncomingCallBanner from '../components/calls/IncomingCallBanner.jsx'
import ProfilePage from './ProfilePage.jsx'
import { loadUserTheme } from '../services/themeService.js'
import { formatTimestamp, truncate } from '../utils/helpers.js'

const ChatPage = () => {
  const { userProfile, logout, user } = useAuth()
  const { conversations, loading: convsLoading } = useConversations()
  const { groups, loading: groupsLoading } = useGroups()
  const callHook = useCall()
  const [activeChat, setActiveChat] = useState(null) // { type: 'dm'|'group', data: conv|group }
  const [showNewChat, setShowNewChat] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callerUser, setCallerUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (user) loadUserTheme(user.uid)
  }, [user])

  useEffect(() => {
    if (callHook.incomingCall) {
      getUserDocument(callHook.incomingCall.callerId).then(setCallerUser)
    }
  }, [callHook.incomingCall])

  // Merge and sort DMs + groups by last message
  const allChats = [
    ...conversations.map(c => ({ type: 'dm', data: c, time: c.lastMessageAt?.toMillis?.() || 0 })),
    ...groups.map(g => ({ type: 'group', data: g, time: g.lastMessageAt?.toMillis?.() || 0 })),
  ].sort((a, b) => b.time - a.time)

  const handleStartCall = (type) => {
    if (!activeChat || activeChat.type !== 'dm') return
    callHook.startCall(activeChat.data.otherUser.uid, activeChat.data.otherUser, type)
    setShowCallModal(true)
  }

  return (
    <div className="chat-page">
      {callHook.callState === 'incoming' && callHook.incomingCall && (
        <IncomingCallBanner
          call={callHook.incomingCall}
          callerUser={callerUser}
          onAccept={() => { callHook.acceptCall(); setShowCallModal(true) }}
          onReject={callHook.rejectIncomingCall}
        />
      )}

      {showCallModal && (
        <CallModal
          callHook={callHook}
          otherUser={activeChat?.data?.otherUser || callerUser}
          onClose={() => { callHook.hangUp(); setShowCallModal(false) }}
        />
      )}

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onStartConversation={(convId, otherUser) => { setActiveChat({ type: 'dm', data: { id: convId, otherUser } }); setShowNewChat(false); setSidebarOpen(false) }} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onGroupCreated={(groupId) => { setShowCreateGroup(false) }} />}
      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
      {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}

      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">Teenz<span>Chat</span></div>
          <div className="sidebar-user">
            <div onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
              <UserAvatar user={userProfile} size={34} />
            </div>
            <button className="theme-toggle-btn" onClick={() => setShowThemePicker(true)}>🎨</button>
            <button className="logout-btn" onClick={logout} />
          </div>
        </div>

        <StoriesBar />

        <div className="sidebar-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="new-chat-btn" style={{ flex: 1 }} onClick={() => setShowNewChat(true)}>New Chat</button>
          <button className="new-chat-btn" style={{ flex: 1 }} onClick={() => setShowCreateGroup(true)}>👥 Group</button>
        </div>

        {/* Combined chats list */}
        <div className="conv-list">
          {allChats.length === 0 && !convsLoading && !groupsLoading ? (
            <div className="conv-list-empty"><p>No chats yet!</p><p>Start a new chat 👋</p></div>
          ) : allChats.map(({ type, data }) => {
            const isActive = activeChat?.data?.id === data.id
            return (
              <button
                key={data.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveChat({ type, data }); setSidebarOpen(false) }}
              >
                <div className="conv-avatar-wrap">
                  {type === 'group' ? (
                    data.photoURL
                      ? <img src={data.photoURL} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>👥</div>
                  ) : (
                    <>
                      <UserAvatar user={data.otherUser} size={46} />
                      {data.otherUser?.isOnline && <span className="online-dot" />}
                    </>
                  )}
                </div>
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{type === 'group' ? data.name : data.otherUser?.username || 'Unknown'}</span>
                    <span className="conv-time">{formatTimestamp(data.lastMessageAt)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-last-msg">
                      {data.lastMessage
                        ? `${data.lastMessage.senderName ? data.lastMessage.senderName + ': ' : data.lastMessage.senderId === user.uid ? 'You: ' : ''}${data.lastMessage.type === 'text' ? truncate(data.lastMessage.text, 28) : `📎 ${data.lastMessage.type}`}`
                        : 'Say something!'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="chat-main">
        {activeChat ? (
          activeChat.type === 'dm' ? (
            <MessageArea
              conversationId={activeChat.data.id}
              otherUser={activeChat.data.otherUser}
              onStartCall={handleStartCall}
              onBackToSidebar={() => setSidebarOpen(true)}
            />
          ) : (
            <GroupMessageArea
              group={activeChat.data}
              onBackToSidebar={() => setSidebarOpen(true)}
            />
          )
        ) : (
          <div className="chat-empty-state">
            <div className="empty-state-icon">💬</div>
            <h2>Pick a chat or start a new one</h2>
            <p>Your conversations will appear here</p>
            <button className="auth-submit-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setShowNewChat(true)}>
              Start chatting
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default ChatPage
