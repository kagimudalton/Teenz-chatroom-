import { useEffect, useRef } from 'react'
import UserAvatar from '../ui/UserAvatar.jsx'

const CallModal = ({ callHook, otherUser, onClose }) => {
  const {
    callState, callType,
    isMuted, isCameraOff,
    localVideoRef, remoteVideoRef,
    callDuration, formatDuration,
    toggleMute, toggleCamera, hangUp,
  } = callHook

  const remoteAudioRef = useRef(null)

  useEffect(() => {
    if (callState === 'ended') {
      setTimeout(onClose, 2000)
    }
  }, [callState])

  // Ensure remote audio plays
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false
      remoteVideoRef.current.volume = 1.0
      remoteVideoRef.current.play?.().catch(console.warn)
    }
  }, [callState])

  const stateLabel = {
    calling: 'Calling…',
    incoming: 'Incoming call…',
    active: formatDuration ? formatDuration(callDuration) : '00:00',
    ended: 'Call ended',
  }[callState] || ''

  return (
    <div className="call-modal">
      <div className="call-remote">
        {callType === 'video' && callState === 'active' ? (
          <video
            ref={remoteVideoRef}
            className="remote-video"
            autoPlay
            playsInline
            muted={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
          />
        ) : (
          <div className="call-avatar-bg">
            <div className="call-avatar-ring">
              <UserAvatar user={otherUser} size={110} />
            </div>
            <div className="call-name">{otherUser?.username || 'User'}</div>
            <div className={`call-state-label ${callState === 'calling' ? 'pulse' : ''}`}>
              {stateLabel}
            </div>
            {/* Hidden audio element for voice calls */}
            {callType === 'audio' && (
              <audio
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                style={{ display: 'none' }}
              />
            )}
          </div>
        )}
      </div>

      {callType === 'video' && (
        <div className={`call-local ${isCameraOff ? 'cam-off' : ''}`}>
          <video
            ref={localVideoRef}
            className="local-video"
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {isCameraOff && (
            <div className="cam-off-overlay">
              <span>📷</span>
              <p>Camera off</p>
            </div>
          )}
        </div>
      )}

      <div className="call-controls">
        <div className="call-controls-row">
          <div className="call-ctrl-group">
            <button className={`call-ctrl-btn ${isMuted ? 'active-ctrl' : ''}`} onClick={toggleMute} />
            <span className="call-ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>
          {callType === 'video' && (
            <div className="call-ctrl-group">
              <button className={`call-ctrl-btn ${isCameraOff ? 'active-ctrl' : ''}`} onClick={toggleCamera} />
              <span className="call-ctrl-label">{isCameraOff ? 'Show cam' : 'Hide cam'}</span>
            </div>
          )}
          <div className="call-ctrl-group">
            <button className="call-ctrl-btn hang-up" onClick={() => { hangUp(); onClose() }} />
            <span className="call-ctrl-label">End</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CallModal
