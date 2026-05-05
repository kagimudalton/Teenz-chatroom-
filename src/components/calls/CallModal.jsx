import { useEffect } from 'react'
import UserAvatar from '../ui/UserAvatar.jsx'

const CallModal = ({ callHook, otherUser, onClose }) => {
  const {
    callState, callType,
    isMuted, isCameraOff,
    localVideoRef, remoteVideoRef,
    callDuration, formatDuration,
    toggleMute, toggleCamera, hangUp,
  } = callHook

  useEffect(() => {
    if (callState === 'ended') {
      setTimeout(onClose, 2000)
    }
  }, [callState])

  const stateLabel = {
    calling: 'Calling…',
    incoming: 'Incoming call…',
    active: callType === 'video' ? formatDuration(callDuration) : `🎤 ${formatDuration(callDuration)}`,
    ended: 'Call ended',
  }[callState] || ''

  return (
    <div className="call-modal">
      {/* Remote video / avatar */}
      <div className="call-remote">
        {callType === 'video' && callState === 'active' ? (
          <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
        ) : (
          <div className="call-avatar-bg">
            <div className="call-avatar-ring">
              <UserAvatar user={otherUser} size={110} />
            </div>
            <div className="call-name">{otherUser?.username}</div>
            <div className={`call-state-label ${callState === 'calling' ? 'pulse' : ''}`}>
              {stateLabel}
            </div>
          </div>
        )}
      </div>

      {/* Local video PIP */}
      {callType === 'video' && (
        <div className={`call-local ${isCameraOff ? 'cam-off' : ''}`}>
          <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
          {isCameraOff && <div className="cam-off-overlay"><span>📷</span><p>Camera off</p></div>}
        </div>
      )}

      {/* Call controls */}
      <div className="call-controls">
        <div className="call-controls-row">
          <div className="call-ctrl-group">
            <button
              className={`call-ctrl-btn ${isMuted ? 'active-ctrl' : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            <span className="call-ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {callType === 'video' && (
            <div className="call-ctrl-group">
              <button
                className={`call-ctrl-btn ${isCameraOff ? 'active-ctrl' : ''}`}
                onClick={toggleCamera}
              >
                {isCameraOff ? '📷' : '📹'}
              </button>
              <span className="call-ctrl-label">{isCameraOff ? 'Show cam' : 'Hide cam'}</span>
            </div>
          )}

          <div className="call-ctrl-group">
            <button
              className="call-ctrl-btn hang-up"
              onClick={() => { hangUp(); onClose() }}
            >
              📵
            </button>
            <span className="call-ctrl-label">End</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CallModal
