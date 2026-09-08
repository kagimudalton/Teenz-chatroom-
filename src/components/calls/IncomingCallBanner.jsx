import { useEffect, useState } from 'react'
import { startRingtone, stopRingtone } from '../../services/ringtoneService.js'
import UserAvatar from '../ui/UserAvatar.jsx'

const IncomingCallBanner = ({ call, callerUser, onAccept, onReject }) => {
  const [visible, setVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
    startRingtone()

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopRingtone()
          onReject('timeout')
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      stopRingtone()
    }
  }, [])

  const handleAccept = () => {
    stopRingtone()
    onAccept()
  }

  const handleReject = () => {
    stopRingtone()
    onReject('declined')
  }

  return (
    <div className={`incoming-call-banner ${visible ? 'visible' : ''}`}>
      <div className="incoming-call-info">
        <div className="incoming-avatar">
          <UserAvatar user={callerUser} size={52} />
        </div>
        <div className="incoming-call-text">
          <div className="incoming-call-name">{callerUser?.username || 'Someone'}</div>
          <div className="incoming-call-type">
            {call.type === 'video' ? '📹' : '📞'} Incoming {call.type} call
          </div>
        </div>
      </div>
      <div className="incoming-call-actions">
        <div className="incoming-call-action-group">
          <button className="reject-call-btn" onClick={handleReject} title="Decline">✕</button>
          <span className="incoming-call-action-label">Decline</span>
        </div>
        <div className="incoming-call-action-group">
          <button className="accept-call-btn" onClick={handleAccept} title="Accept">✓</button>
          <span className="incoming-call-action-label">Accept</span>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallBanner
