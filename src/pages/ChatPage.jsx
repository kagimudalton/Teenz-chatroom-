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
import { markMessagesAsDelivered } from '../services/chatService.js'
import { archiveConversation, unarchiveConversation } from '../services/chatService.js'
import { archiveGroup, unarchiveGroup } from '../services/groupService.js'
import { isUnlockedThisSession, markUnlockedThisSession, verifyPin, lockChat, unlockChat } from '../services/lockService.js'
import LockScreen from '../components/auth/LockScreen.jsx'
import FullscreenViewer from '../components/ui/FullscreenViewer.jsx'
import { getActiveHoliday, isHolidayThemeEnabled, setHolidayThemeEnabled } from '../services/holidayService.js'
import HolidayOverlay from '../components/ui/HolidayOverlay.jsx'

const ChatPage = () => {
  const { userProfile, logout, user, refreshProfile } = useAuth()
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
  const [showHolidayEffects, setShowHolidayEffects] = useState(isHolidayThemeEnabled())
  const [appUnlocked, setAppUnlocked] = useState(isUnlockedThisSession())
  const [chatLockPrompt, setChatLockPrompt] = useState(null) // { type, data } pending unlock
  const [unlockPinInput, setUnlockPinInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlockedChatIds, setUnlockedChatIds] = useState(new Set())

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
    if (!user) return
    conversations.forEach((conv) => {
      if (conv.lastMessage && conv.lastMessage.senderId !== user.uid) {
        markMessagesAsDelivered(conv.id, user.uid)
      }
    })
  }, [conversations, user])

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

  const [sidebarTab, setSidebarTab] = useState('all')
  const isUnread = (item) => (item.data.unreadCount?.[user?.uid] || 0) > 0
  const isArchived = (item) => (item.data.archivedFor || []).includes(user?.uid)
  const visibleChats = allChats.filter(item => {
    if (sidebarTab === 'archived') return isArchived(item)
    if (isArchived(item)) return false
    if (sidebarTab === 'unread') return isUnread(item)
    if (sidebarTab === 'groups') return item.type === 'group'
    return true
  })
  const totalUnreadCount = allChats.filter(item => !isArchived(item) && isUnread(item)).length
  const totalArchivedCount = allChats.filter(item => isArchived(item) && isUnread(item)).length

  const [archiveContextMenu, setArchiveContextMenu] = useState(null) // { type, data }
  const [fullscreenAvatar, setFullscreenAvatar] = useState(null)

  const handleToggleArchive = async (item) => {
    const isCurrentlyArchived = (item.data.archivedFor || []).includes(user.uid)
    try {
      if (item.type === 'group') {
        await (isCurrentlyArchived ? unarchiveGroup : archiveGroup)(item.data.id, user.uid)
      } else {
        await (isCurrentlyArchived ? unarchiveConversation : archiveConversation)(item.data.id, user.uid)
      }
    } catch (err) {
      console.error('Archive toggle failed:', err)
    }
    setArchiveContextMenu(null)
  }

  const handleUnlockChat = async (e) => {
    e.preventDefault()
    if (!chatLockPrompt) return
    const valid = await verifyPin(unlockPinInput, userProfile?.security?.pinHash)
    if (valid) {
      setUnlockedChatIds(prev => new Set(prev).add(chatLockPrompt.data.id))
      setActiveChat(chatLockPrompt)
      setSidebarOpen(false)
      setChatLockPrompt(null)
      setUnlockPinInput('')
      setUnlockError('')
    } else {
      setUnlockError('Incorrect PIN.')
      setUnlockPinInput('')
    }
  }

  const handleStartCall = (type) => {
    if (!activeChat || activeChat.type !== 'dm') return
    callHook.startCall(activeChat.data.otherUser.uid, activeChat.data.otherUser, type)
    setShowCallModal(true)
  }

  const handleStartConversation = (convId, otherUser) => {
    setActiveChat({ type: 'dm', data: { id: convId, otherUser } })
    setSidebarOpen(false)
  }

  const liveActiveChatData = activeChat
    ? (activeChat.type === 'group'
        ? groups.find(g => g.id === activeChat.data.id) || activeChat.data
        : conversations.find(c => c.id === activeChat.data.id) || activeChat.data)
    : null

  const activeHoliday = getActiveHoliday()

  if (userProfile?.security?.appLockEnabled && userProfile?.security?.pinHash && !appUnlocked) {
    return (
      <LockScreen
        pinHash={userProfile.security.pinHash}
        onUnlock={() => { markUnlockedThisSession(); setAppUnlocked(true) }}
      />
    )
  }

  return (
    <div className="chat-page">
      {archiveContextMenu && (
        <div className="conv-context-overlay" onClick={() => setArchiveContextMenu(null)}>
          <div className="conv-context-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => handleToggleArchive(archiveContextMenu)}>
              {(archiveContextMenu.data.archivedFor || []).includes(user.uid) ? '📤 Unarchive chat' : '🗄️ Archive chat'}
            </button>
            <button onClick={() => setArchiveContextMenu(null)}>✕ Close</button>
          </div>
        </div>
      )}

      {chatLockPrompt && (
        <div className="lock-screen" onClick={() => { setChatLockPrompt(null); setUnlockPinInput(''); setUnlockError('') }}>
          <div className="lock-screen-card" onClick={e => e.stopPropagation()}>
            <div className="lock-screen-icon">🔒</div>
            <h2>This chat is locked</h2>
            <p>Enter your PIN to open it</p>
            <form onSubmit={handleUnlockChat}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className="lock-pin-input"
                value={unlockPinInput}
                onChange={(e) => setUnlockPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
              />
              {unlockError && <p className="lock-screen-error">{unlockError}</p>}
              <button type="submit" className="lock-unlock-btn" disabled={unlockPinInput.length < 4}>Unlock</button>
            </form>
          </div>
        </div>
      )}

      {fullscreenAvatar && (
        <FullscreenViewer mediaURL={fullscreenAvatar.url} mediaType={fullscreenAvatar.type} onClose={() => setFullscreenAvatar(null)} />
      )}

      {activeHoliday && showHolidayEffects && (
        <HolidayOverlay particle={activeHoliday.particle} />
      )}
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
            {activeHoliday && (
              <button
                className="theme-toggle-btn"
                title={showHolidayEffects ? `Turn off ${activeHoliday.name} effects` : `Turn on ${activeHoliday.name} effects`}
                onClick={() => {
                  const next = !showHolidayEffects
                  setShowHolidayEffects(next)
                  setHolidayThemeEnabled(next)
                }}
              >
                {activeHoliday.particle}
              </button>
            )}
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
          {visibleChats.length === 0 && !convsLoading && !groupsLoading ? (
            <div className="conv-list-empty">
              <p>{sidebarTab === 'unread' ? 'No unread chats' : sidebarTab === 'groups' ? 'No groups yet' : sidebarTab === 'archived' ? 'No archived chats' : 'No chats yet!'}</p>
              {sidebarTab === 'all' && <p>Start a new chat 👋</p>}
            </div>
          ) : visibleChats.map(({ type, data }) => {
            const isActive = activeChat?.data?.id === data.id
            return (
              <button
                key={data.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  const isLocked = userProfile?.security?.lockedChatIds?.includes(data.id) && !unlockedChatIds.has(data.id)
                  if (isLocked) {
                    setChatLockPrompt({ type, data })
                  } else {
                    setActiveChat({ type, data })
                    setSidebarOpen(false)
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); setArchiveContextMenu({ type, data }) }}
              >
                <div className="conv-avatar-wrap">
                  {type === 'group' ? (
                    data.photoURL
                      ? <img src={data.photoURL} style={{ width: 46, height: 46, minWidth: 46, minHeight: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setFullscreenAvatar({ url: data.photoURL, type: 'image' }) }} />
                      : <div style={{ width: 46, height: 46, minWidth: 46, minHeight: 46, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>👥</div>
                  ) : (
                    <>
                      <UserAvatar user={data.otherUser} size={46} showViewer={true} />
                      {data.otherUser?.isOnline && <span className="online-dot" />}
                    </>
                  )}
                </div>
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">
                      {userProfile?.security?.lockedChatIds?.includes(data.id) && '🔒 '}
                      {type === 'group' ? data.name : data.otherUser?.username || 'Unknown'}
                    </span>
                    <span className="conv-time">{formatTimestamp(data.lastMessageAt)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-last-msg">
                      {data.lastMessage
                        ? `${data.lastMessage.senderId === user.uid ? 'You: ' : ''}${data.lastMessage.type === 'text' ? truncate(data.lastMessage.text, 28) : `📎 ${data.lastMessage.type}`}`
                        : 'Say something!'}
                    </span>
                    {(data.unreadCount?.[user?.uid] || 0) > 0 && (
                      <span className="conv-unread-badge">{data.unreadCount[user.uid]}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="sidebar-bottom-nav">
          <button className={`bottom-nav-btn ${sidebarTab === 'all' ? 'active' : ''}`} onClick={() => setSidebarTab('all')}>
            <span className="bottom-nav-icon">💬</span>
            <span>Chats</span>
          </button>
          <button className={`bottom-nav-btn ${sidebarTab === 'unread' ? 'active' : ''}`} onClick={() => setSidebarTab('unread')}>
            <span className="bottom-nav-icon">
              📩
              {totalUnreadCount > 0 && <span className="bottom-nav-badge">{totalUnreadCount}</span>}
            </span>
            <span>Unread</span>
          </button>
          <button className={`bottom-nav-btn ${sidebarTab === 'groups' ? 'active' : ''}`} onClick={() => setSidebarTab('groups')}>
            <span className="bottom-nav-icon">👥</span>
            <span>Groups</span>
          </button>
          <button className={`bottom-nav-btn ${sidebarTab === 'archived' ? 'active' : ''}`} onClick={() => setSidebarTab('archived')}>
            <span className="bottom-nav-icon">
              🗄️
              {totalArchivedCount > 0 && <span className="bottom-nav-badge">{totalArchivedCount}</span>}
            </span>
            <span>Archived</span>
          </button>
        </div>
      </aside>

      <main className="chat-main">
        {activeChat ? (
          activeChat.type === 'dm' ? (
            <MessageArea
              conversationId={liveActiveChatData.id}
              otherUser={liveActiveChatData.otherUser}
              disappearingDuration={liveActiveChatData.disappearingDuration}
              isBlocked={userProfile?.blockedUsers?.includes(liveActiveChatData.otherUser?.uid)}
              pinnedMessage={liveActiveChatData.pinnedMessage}
              isLocked={userProfile?.security?.lockedChatIds?.includes(liveActiveChatData.id)}
              hasPinSet={!!userProfile?.security?.pinHash}
              onToggleLock={async () => {
                const locked = userProfile?.security?.lockedChatIds?.includes(liveActiveChatData.id)
                await (locked ? unlockChat : lockChat)(user.uid, liveActiveChatData.id)
                await refreshProfile()
              }}
              onStartCall={handleStartCall}
              onBackToSidebar={() => setSidebarOpen(true)}
              onExitChat={() => setActiveChat(null)}
            />
          ) : (
            <GroupMessageArea
              group={liveActiveChatData}
              isLocked={userProfile?.security?.lockedChatIds?.includes(liveActiveChatData.id)}
              hasPinSet={!!userProfile?.security?.pinHash}
              onToggleLock={async () => {
                const locked = userProfile?.security?.lockedChatIds?.includes(liveActiveChatData.id)
                await (locked ? unlockChat : lockChat)(user.uid, liveActiveChatData.id)
                await refreshProfile()
              }}
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
