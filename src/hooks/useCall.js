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
  const [error, setError] = useState(null)
  const [callDuration, setCallDuration] = useState(0)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
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

  // Call duration timer
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  const startCall = useCallback(async (partnerId, partnerUser, type = 'video') => {
    try {
      setError(null)
      setCallState('calling')
      setCallType(type)
      setCallPartner(partnerUser)

      const stream = await getLocalStream(type === 'video', true)
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const { callId, peerConnection, cleanup } = await initiateCall(user.uid, partnerId, type)
      callIdRef.current = callId
      peerConnectionRef.current = peerConnection
      cleanupRef.current = cleanup

      addStreamToPeerConnection(peerConnection, stream)

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
        setCallState('active')
      }

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected') hangUp()
      }
    } catch (err) {
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
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const { peerConnection, callData, cleanup } = await answerCall(callId)
      callIdRef.current = callId
      peerConnectionRef.current = peerConnection
      cleanupRef.current = cleanup
      setCallPartner({ uid: callData.callerId })

      addStreamToPeerConnection(peerConnection, stream)

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
      }

      setCallState('active')
      setIncomingCall(null)
    } catch (err) {
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

  const hangUp = useCallback(async () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop())
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
    isMuted, isCameraOff, error,
    localVideoRef, remoteVideoRef,
    callDuration, formatDuration,
    startCall, acceptCall, rejectIncomingCall, hangUp,
    toggleMute, toggleCamera,
  }
}
