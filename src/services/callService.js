import { doc, collection, setDoc, getDoc, updateDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

export const initiateCall = async (callerId, receiverId, type = 'video') => {
  const callRef = doc(collection(db, 'calls'))
  const callId = callRef.id
  const peerConnection = new RTCPeerConnection(ICE_SERVERS)

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(collection(db, 'calls', callId, 'callerCandidates'), {
        ...event.candidate.toJSON(),
        createdAt: serverTimestamp(),
      })
    }
  }

  const offerDescription = await peerConnection.createOffer()
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
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))
        }
      })
    }
  )

  return {
    callId, peerConnection,
    cleanup: () => { unsubscribeAnswer(); unsubscribeReceiverCandidates() },
  }
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
        ...event.candidate.toJSON(),
        createdAt: serverTimestamp(),
      })
    }
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
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))
        }
      })
    }
  )

  return { peerConnection, callData, cleanup: unsubscribeCallerCandidates }
}

export const rejectCall = async (callId) => {
  await updateDoc(doc(db, 'calls', callId), { status: 'rejected', endedAt: serverTimestamp() })
}

export const endCall = async (callId, peerConnection) => {
  if (peerConnection) peerConnection.close()
  await updateDoc(doc(db, 'calls', callId), { status: 'ended', endedAt: serverTimestamp() })
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
    return await navigator.mediaDevices.getUserMedia({
      video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      audio: audioEnabled,
    })
  } catch (error) {
    if (error.name === 'NotAllowedError') throw new Error('Camera/microphone access denied.')
    throw error
  }
}

export const addStreamToPeerConnection = (peerConnection, stream) => {
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))
}
