import { useState, useEffect, useRef, useCallback } from 'react'
import { initiateCall, answerCall, rejectCall, endCall, getLocalStream, addStreamToPeerConnection, subscribeToIncomingCalls } from '../services/callService.js'
import { useAuth } from '../features/auth/AuthContext.jsx'

export const useCall = () => {
  const { user } = useAuth()
  const [callState, setCallState] = useState('idle')
  const [callType, setCallType] = useState('video')
  const [incomingCall, setIncomingCall] = useState(null)
  const [callPartner, setCallPartner] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState(null)
  const [callDuration, setCallDuration] = useState(0)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const cameraTrackRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const callIdRef = useRef(null)
  const cleanupRef = useRef(null)
  const timerRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToIncomingCalls(user.uid, (call) => {
      if (callState === 'idle') {
        setIncomingCall(call)
        setCallState('incoming')
        setCallType(call.type)
      }
    })
    return () => unsubscribe()
  }, [user, callState])

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  const attachStream = useCallback((ref, stream) => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
      ref.current.muted = ref === localVideoRef
      ref.current.volume = ref === remoteVideoRef ? 1.0 : 0
      ref.current.play().catch(e => console.warn('play error:', e))
    }
  }, [])

  const startCall = useCallback(async (partnerId, partnerUser, type = 'video') => {
    try {
      setError(null)
      setCallState('calling')
      setCallType(type)
      setCallPartner(partnerUser)

      const stream = await getLocalStream(type === 'video', true)
      localStreamRef.current = stream

      // Ensure all tracks enabled
      stream.getTracks().forEach(t => { t.enabled = true })
      attachStream(localVideoRef, stream)

      const { callId, peerConnection, cleanup } = await initiateCall(user.uid, partnerId, type)
      callIdRef.current = callId
      peerConnectionRef.current = peerConnection
      cleanupRef.current = cleanup

      addStreamToPeerConnection(peerConnection, stream)

      peerConnection.ontrack = (event) => {
        console.log('Got remote track:', event.track.kind)
        const remoteStream = event.streams[0] || new MediaStream([event.track])
        remoteStreamRef.current = remoteStream
        attachStream(remoteVideoRef, remoteStream)
        setCallState('active')
      }

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState)
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
          hangUp()
        }
      }
    } catch (err) {
      console.error('startCall error:', err)
      setError(err.message)
      setCallState('idle')
    }
  }, [user])

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return
    try {
      setError(null)
      const { callId, type } = incomingCall

      const stream = await getLocalStream(type === 'video', true)
      localStreamRef.current = stream
      stream.getTracks().forEach(t => { t.enabled = true })
      attachStream(localVideoRef, stream)

      const { peerConnection, callData, cleanup } = await answerCall(callId)
      callIdRef.current = callId
      peerConnectionRef.current = peerConnection
      cleanupRef.current = cleanup
      setCallPartner({ uid: callData.callerId })

      addStreamToPeerConnection(peerConnection, stream)

      peerConnection.ontrack = (event) => {
        console.log('Got remote track (receiver):', event.track.kind)
        const remoteStream = event.streams[0] || new MediaStream([event.track])
        remoteStreamRef.current = remoteStream
        attachStream(remoteVideoRef, remoteStream)
        setCallState('active')
      }

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state (receiver):', peerConnection.connectionState)
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
          hangUp()
        }
      }

      setCallState('active')
      setIncomingCall(null)
    } catch (err) {
      console.error('acceptCall error:', err)
      setError(err.message)
      setCallState('idle')
    }
  }, [incomingCall])

  const rejectIncomingCall = useCallback(async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.callId)
      setIncomingCall(null)
      setCallState('idle')
    }
  }, [incomingCall])

  const toggleScreenShare = useCallback(async () => {
    const peerConnection = peerConnectionRef.current
    if (!peerConnection) return

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        screenStreamRef.current = screenStream

        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) {
          cameraTrackRef.current = sender.track
          await sender.replaceTrack(screenTrack)
        }
        attachStream(localVideoRef, screenStream)
        setIsScreenSharing(true)

        // Auto-revert if the user stops sharing via the browser's own UI
        screenTrack.onended = () => {
          revertToCamera()
        }
      } catch (err) {
        console.warn('Screen share failed or was cancelled:', err.message)
      }
    } else {
      revertToCamera()
    }
  }, [isScreenSharing])

  const revertToCamera = useCallback(() => {
    const peerConnection = peerConnectionRef.current
    const cameraTrack = cameraTrackRef.current
    if (peerConnection && cameraTrack) {
      const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video')
      if (sender) sender.replaceTrack(cameraTrack)
      attachStream(localVideoRef, localStreamRef.current)
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    setIsScreenSharing(false)
  }, [])

  const hangUp = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    cameraTrackRef.current = null
    setIsScreenSharing(false)
    if (cleanupRef.current) cleanupRef.current()
    if (callIdRef.current) await endCall(callIdRef.current, peerConnectionRef.current)
    setCallState('ended')
    setCallPartner(null)
    setIncomingCall(null)
    peerConnectionRef.current = null
    localStreamRef.current = null
    callIdRef.current = null
    setTimeout(() => setCallState('idle'), 2000)
  }, [])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(p => !p)
    }
  }, [])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setIsCameraOff(p => !p)
    }
  }, [])

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return {
    callState, callType, callPartner, incomingCall,
    isMuted, isCameraOff, isScreenSharing, error,
    localVideoRef, remoteVideoRef,
    callDuration, formatDuration,
    startCall, acceptCall, rejectIncomingCall, hangUp,
    toggleMute, toggleCamera, toggleScreenShare,
  }
}
