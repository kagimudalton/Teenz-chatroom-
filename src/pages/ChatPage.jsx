import { useState, useEffect } from 'react'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { useConversations } from '../hooks/useConversations.js'
import { useCall } from '../hooks/useCall.js'
import { getUserDocument } from '../services/authService.js'
import ConversationList from '../components/chat/ConversationList.jsx'
import MessageArea from '../components/chat/MessageArea.jsx'
import StoriesBar from '../components/stories/StoriesBar.jsx'
import NewChatModal from '../components/chat/NewChatModal.jsx'
import UserAvatar from '../components/ui/UserAvatar.jsx'
import ThemePicker from '../components/ui/ThemePicker.jsx'
import CallModal from '../components/calls/CallModal.jsx'
import IncomingCallBanner from '../components/calls/IncomingCallBanner.jsx'
import { loadUserTheme } from '../services/themeService.js'

const ChatPage = () => {
  const { userProfile, logout, user } = useAuth()
  const { conversations, loading: convsLoading } = useConversations()
  const callHook = useCall()
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [activeOtherUser, setActiveOtherUser] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callerUser, setCallerUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (user) loadUserTheme(user.uid)
  }, [user])

  // Fetch caller info when incoming call arrives
  useEffect(() => {
    if (callHook.incomingCall) {
      getUserDocument(callHook.incomingCall.callerId).then(setCallerUser)
    }
  }, [callHook.incomingCall])

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id)
    setActiveOtherUser(conv.otherUser)
    setSidebarOpen(false)
  }

  const handleNewConversation = (conversationId, otherUser) => {
    setActiveConversationId(conversationId)
    setActiveOtherUser(otherUser)
    setShowNewChat(false)
    setSidebarOpen(false)
  }

  const handleStartCall = (type) => {
    if (!activeOtherUser) return
    callHook.startCall(activeOtherUser.uid, activeOtherUser, type)
    setShowCallModal(true)
  }

  return (
    <div className="chat-page">
      {/* Incoming call banner */}
      {callHook.callState === 'incoming' && callHook.incomingCall && (
        <IncomingCallBanner
          call={callHook.incomingCall}
          callerUser={callerUser}
          onAccept={() => { callHook.acceptCall(); setShowCallModal(true) }}
          onReject={callHook.rejectIncomingCall}
        />
      )}

      {/* Active call modal */}
      {showCallModal && (
        <CallModal
          callHook={callHook}
          otherUser={activeOtherUser || callerUser}
          onClose={() => { callHook.hangUp(); setShowCallModal(false) }}
        />
      )}

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStartConversation={handleNewConversation}
        />
      )}

      {showThemePicker && (
        <ThemePicker onClose={() => setShowThemePicker(false)} />
      )}

      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">Teenz<span>Chat</span></div>
          <div className="sidebar-user">
            <UserAvatar user={userProfile} size={34} />
            <button className="theme-toggle-btn" onClick={() => setShowThemePicker(true)} title="Change theme">🎨</button>
            <button className="logout-btn" onClick={logout} title="Sign out">⎋</button>
          </div>
        </div>
        <StoriesBar />
        <div className="sidebar-actions">
          <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>✏️ New Chat</button>
        </div>
        <ConversationList
          conversations={conversations}
          loading={convsLoading}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
        />
      </aside>

      <main className="chat-main">
        {activeConversationId && activeOtherUser ? (
          <MessageArea
            conversationId={activeConversationId}
            otherUser={activeOtherUser}
            onStartCall={handleStartCall}
            onBackToSidebar={() => setSidebarOpen(true)}
          />
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
