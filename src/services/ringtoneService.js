// Ringtone using Web Audio API - no external files needed
let audioCtx = null
let ringtoneInterval = null
let isRinging = false

const createRingtone = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()

  const playBeep = () => {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.15)

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.4)
  }

  return playBeep
}

export const startRingtone = () => {
  if (isRinging) return
  isRinging = true

  try {
    const playBeep = createRingtone()
    playBeep()
    ringtoneInterval = setInterval(playBeep, 1200)
  } catch (err) {
    console.warn('Ringtone error:', err)
  }
}

export const stopRingtone = () => {
  isRinging = false
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval)
    ringtoneInterval = null
  }
}
