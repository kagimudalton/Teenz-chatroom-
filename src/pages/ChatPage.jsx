import { useState } from 'react'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { useConversations } from '../hooks/useConversations.js'
import ConversationList from '../components/chat/ConversationList.jsx'
import MessageArea from '../components/chat/MessageArea.jsx'
import StoriesBar from '../components/stories/StoriesBar.jsx'
import NewChatModal from '../components/chat/NewChatModal.jsx'
import UserAvatar from '../components/ui/UserAvatar.jsx'

const ChatPage = () => {
  const { userProfile, logout } = useAuth()
  const { conversations, loading: convsLoading } = useConversations()
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [activeOtherUser, setActiveOtherUser] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  return (
    <div className="chat-page">
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onStartConversation={handleNewConversation} />}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">Teenz<span>Chat</span></div>
          <div className="sidebar-user">
            <UserAvatar user={userProfile} size={34} />
            <button className="logout-btn" onClick={logout} title="Sign out">⎋</button>
          </div>
        </div>
        <StoriesBar />
        <div className="sidebar-actions">
          <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>✏️ New Chat</button>
        </div>
        <ConversationList conversations={conversations} loading={convsLoading} activeId={activeConversationId} onSelect={handleSelectConversation} />
      </aside>
      <main className="chat-main">
        {activeConversationId && activeOtherUser ? (
          <MessageArea conversationId={activeConversationId} otherUser={activeOtherUser} onBackToSidebar={() => setSidebarOpen(true)} />
        ) : (
          <div className="chat-empty-state">
            <div className="empty-state-icon">💬</div>
            <h2>Pick a chat or start a new one</h2>
            <p>Your conversations will appear here</p>
            <button className="auth-submit-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setShowNewChat(true)}>Start chatting</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default ChatPage
