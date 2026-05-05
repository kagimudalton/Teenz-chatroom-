import { useEffect, useState } from 'react'
import UserAvatar from '../ui/UserAvatar.jsx'

const IncomingCallBanner = ({ call, callerUser, onAccept, onReject }) => {
  const [visible, setVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { onReject(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`incoming-call-banner ${visible ? 'visible' : ''}`}>
      <div className="incoming-call-info">
        <div className="incoming-avatar">
          <UserAvatar user={callerUser} size={48} />
          <div className={`call-type-badge ${call.type}`}>
            {call.type === 'video' ? '📹' : '📞'}
          </div>
        </div>
        <div className="incoming-call-text">
          <div className="incoming-call-name">{callerUser?.username || 'Someone'}</div>
          <div className="incoming-call-type">Incoming {call.type} call • {timeLeft}s</div>
        </div>
      </div>
      <div className="incoming-call-actions">
        <button className="reject-call-btn" onClick={onReject} title="Decline">
          📵
        </button>
        <button className="accept-call-btn" onClick={onAccept} title="Accept">
          📞
        </button>
      </div>
    </div>
  )
}

export default IncomingCallBanner
