import { doc, collection, setDoc, getDoc, updateDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

export const initiateCall = async (callerId, receiverId, type = 'video') => {
  const callRef = doc(collection(db, 'calls'))
  const callId = callRef.id
  const peerConnection = new RTCPeerConnection(ICE_SERVERS)

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(collection(db, 'calls', callId, 'callerCandidates'), {
        ...event.candidate.toJSON(), createdAt: serverTimestamp(),
      })
    }
  }

  // Log connection state for debugging
  peerConnection.onconnectionstatechange = () => {
    console.log('Call connection state:', peerConnection.connectionState)
  }

  peerConnection.onicegatheringstatechange = () => {
    console.log('ICE gathering state:', peerConnection.iceGatheringState)
  }

  const offerDescription = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: type === 'video',
  })
  await peerConnection.setLocalDescription(offerDescription)

  await setDoc(callRef, {
    callId, callerId, receiverId, type,
    status: 'calling',
    offer: { type: offerDescription.type, sdp: offerDescription.sdp },
    createdAt: serverTimestamp(),
  })

  const unsubscribeAnswer = onSnapshot(callRef, (snap) => {
    const data = snap.data()
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
    }
    if (data?.status === 'rejected' || data?.status === 'ended') {
      peerConnection.close()
    }
  })

  const unsubscribeReceiverCandidates = onSnapshot(
    collection(db, 'calls', callId, 'receiverCandidates'),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(console.warn)
        }
      })
    }
  )

  return { callId, peerConnection, cleanup: () => { unsubscribeAnswer(); unsubscribeReceiverCandidates() } }
}

export const answerCall = async (callId) => {
  const callRef = doc(db, 'calls', callId)
  const callSnap = await getDoc(callRef)
  if (!callSnap.exists()) throw new Error('Call not found.')

  const callData = callSnap.data()
  const peerConnection = new RTCPeerConnection(ICE_SERVERS)

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(collection(db, 'calls', callId, 'receiverCandidates'), {
        ...event.candidate.toJSON(), createdAt: serverTimestamp(),
      })
    }
  }

  peerConnection.onconnectionstatechange = () => {
    console.log('Answer connection state:', peerConnection.connectionState)
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer))
  const answerDescription = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answerDescription)

  await updateDoc(callRef, {
    answer: { type: answerDescription.type, sdp: answerDescription.sdp },
    status: 'accepted',
    answeredAt: serverTimestamp(),
  })

  const unsubscribeCallerCandidates = onSnapshot(
    collection(db, 'calls', callId, 'callerCandidates'),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(console.warn)
        }
      })
    }
  )

  return { peerConnection, callData, cleanup: unsubscribeCallerCandidates }
}

export const rejectCall = async (callId, reason = 'declined') => {
  await updateDoc(doc(db, 'calls', callId), { status: 'rejected', reason, endedAt: serverTimestamp() })
}

export const endCall = async (callId, peerConnection) => {
  if (peerConnection) peerConnection.close()
  try {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended', endedAt: serverTimestamp() })
  } catch (err) {
    console.warn('endCall error:', err)
  }
}

export const subscribeToIncomingCalls = (userId, callback) => {
  return onSnapshot(collection(db, 'calls'), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const data = change.doc.data()
        if (data.receiverId === userId && data.status === 'calling') {
          callback({ callId: change.doc.id, ...data })
        }
      }
    })
  })
}

export const getLocalStream = async (videoEnabled = true, audioEnabled = true) => {
  try {
    const constraints = {
      audio: audioEnabled ? {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1,
      } : false,
      video: videoEnabled ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      } : false,
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    // Ensure audio tracks are enabled
    stream.getAudioTracks().forEach(track => {
      track.enabled = true
      console.log('Audio track:', track.label, 'enabled:', track.enabled)
    })
    
    return stream
  } catch (error) {
    console.error('getLocalStream error:', error)
    if (error.name === 'NotAllowedError') throw new Error('Camera/microphone access denied. Please allow permissions and try again.')
    if (error.name === 'NotFoundError') throw new Error('No camera or microphone found.')
    throw error
  }
}

export const addStreamToPeerConnection = (peerConnection, stream) => {
  stream.getTracks().forEach((track) => {
    console.log('Adding track to peer connection:', track.kind, track.label)
    peerConnection.addTrack(track, stream)
  })
}
