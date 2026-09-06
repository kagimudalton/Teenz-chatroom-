import { useState, useEffect, useRef } from 'react'
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
import ContactSync from '../components/chat/ContactSync.jsx'
import UserAvatar from '../components/ui/UserAvatar.jsx'
import ThemePicker from '../components/ui/ThemePicker.jsx'
import CallModal from '../components/calls/CallModal.jsx'
import IncomingCallBanner from '../components/calls/IncomingCallBanner.jsx'
import ProfilePage from './ProfilePage.jsx'
import { loadUserTheme } from '../services/themeService.js'
import { formatTimestamp, truncate } from '../utils/helpers.js'
import { requestNotificationPermission, showMessageNotification } from '../services/notificationService.js'

const ChatPage = () => {
  const { userProfile, logout, user } = useAuth()
  const { conversations, loading: convsLoading } = useConversations()
  const { groups, loading: groupsLoading } = useGroups()
  const callHook = useCall()
  const [activeChat, setActiveChat] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callerUser, setCallerUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (user) loadUserTheme(user.uid)
  }, [user])

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const prevConvosRef = useRef(new Map())
  const activeChatRef = useRef(activeChat)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  useEffect(() => {
    const prevMap = prevConvosRef.current
    conversations.forEach((conv) => {
      const prevTime = prevMap.get(conv.id)
      const newTime = conv.lastMessageAt?.toMillis?.() || 0
      const isFromOther = conv.lastMessage && conv.lastMessage.senderId !== user?.uid
      const isCurrentlyOpen = activeChatRef.current?.type === 'dm' && activeChatRef.current?.data?.id === conv.id
      if (prevTime !== undefined && newTime > prevTime && isFromOther && (document.hidden || !isCurrentlyOpen)) {
        showMessageNotification({
          title: conv.otherUser?.username || 'New message',
          body: conv.lastMessage.type === 'text' ? truncate(conv.lastMessage.text, 80) : `📎 ${conv.lastMessage.type}`,
          icon: conv.otherUser?.photoURL,
          tag: `conv-${conv.id}`,
          onClick: () => handleStartConversation(conv.id, conv.otherUser),
        })
      }
      prevMap.set(conv.id, newTime)
    })
  }, [conversations, user])

  const prevGroupsRef = useRef(new Map())
  useEffect(() => {
    const prevMap = prevGroupsRef.current
    groups.forEach((grp) => {
      const prevTime = prevMap.get(grp.id)
      const newTime = grp.lastMessageAt?.toMillis?.() || 0
      const isFromOther = grp.lastMessage && grp.lastMessage.senderId !== user?.uid
      const isCurrentlyOpen = activeChatRef.current?.type === 'group' && activeChatRef.current?.data?.id === grp.id
      if (prevTime !== undefined && newTime > prevTime && isFromOther && (document.hidden || !isCurrentlyOpen)) {
        showMessageNotification({
          title: grp.name || 'New group message',
          body: grp.lastMessage.type === 'text' ? truncate(grp.lastMessage.text, 80) : `📎 ${grp.lastMessage.type}`,
          icon: grp.photoURL,
          tag: `group-${grp.id}`,
          onClick: () => setActiveChat({ type: 'group', data: grp }),
        })
      }
      prevMap.set(grp.id, newTime)
    })
  }, [groups, user])

  useEffect(() => {
    if (callHook.incomingCall) {
      getUserDocument(callHook.incomingCall.callerId).then(setCallerUser)
    }
  }, [callHook.incomingCall])

  const allChats = [
    ...conversations.map(c => ({ type: 'dm', data: c, time: c.lastMessageAt?.toMillis?.() || 0 })),
    ...groups.map(g => ({ type: 'group', data: g, time: g.lastMessageAt?.toMillis?.() || 0 })),
  ].sort((a, b) => b.time - a.time)

  const handleStartCall = (type) => {
    if (!activeChat || activeChat.type !== 'dm') return
    callHook.startCall(activeChat.data.otherUser.uid, activeChat.data.otherUser, type)
    setShowCallModal(true)
  }

  const handleStartConversation = (convId, otherUser) => {
    setActiveChat({ type: 'dm', data: { id: convId, otherUser } })
    setSidebarOpen(false)
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

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStartConversation={(convId, otherUser) => {
            handleStartConversation(convId, otherUser)
            setShowNewChat(false)
          }}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={() => setShowCreateGroup(false)}
        />
      )}

      {showContacts && (
        <ContactSync
          onStartConversation={handleStartConversation}
          onClose={() => setShowContacts(false)}
        />
      )}

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

        <div className="sidebar-actions" style={{ display: 'flex', gap: 6, padding: '10px 12px' }}>
          <button className="new-chat-btn" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setShowNewChat(true)}>✏️ Chat</button>
          <button className="new-chat-btn" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setShowCreateGroup(true)}>👥 Group</button>
          <button className="new-chat-btn" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setShowContacts(true)}>👤 People</button>
        </div>

        <div className="conv-list">
          {allChats.length === 0 && !convsLoading && !groupsLoading ? (
            <div className="conv-list-empty">
              <p>No chats yet!</p>
              <p>Start a new chat 👋</p>
            </div>
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
                      ? <img src={data.photoURL} style={{ width: 46, height: 46, minWidth: 46, minHeight: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 46, height: 46, minWidth: 46, minHeight: 46, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>👥</div>
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
                        ? `${data.lastMessage.senderId === user.uid ? 'You: ' : ''}${data.lastMessage.type === 'text' ? truncate(data.lastMessage.text, 28) : `📎 ${data.lastMessage.type}`}`
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
              onExitChat={() => setActiveChat(null)}
            />
          ) : (
            <GroupMessageArea
              group={activeChat.data}
              onBackToSidebar={() => setSidebarOpen(true)}
              onExitChat={() => setActiveChat(null)}
            />
          )
        ) : (
          <div className="chat-empty-state">
            <div className="empty-state-icon">💬</div>
            <h2>Pick a chat or start a new one</h2>
            <p>Your conversations will appear here</p>
            <button
              className="auth-submit-btn"
              style={{ maxWidth: 200, margin: '0 auto' }}
              onClick={() => setShowNewChat(true)}
            >
              Start chatting
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default ChatPage
