import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

const AudioRecorder = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState(Array(24).fill(6))

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    startRecording()
    return () => stopEverything()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start()
      setRecording(true)

      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser
      animateWaveform()
    } catch (err) {
      toast.error('Microphone access denied')
      onCancel()
    }
  }

  const animateWaveform = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const bars = Array.from({ length: 24 }, (_, i) => {
      const v = data[i % data.length] || 0
      return Math.max(6, Math.min(100, (v / 255) * 100))
    })
    setLevels(bars)
    rafRef.current = requestAnimationFrame(animateWaveform)
  }

  const stopEverything = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
    }
  }

  const handleSend = () => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      onSend(blob)
    }
    stopEverything()
  }

  const handleCancel = () => {
    stopEverything()
    onCancel()
  }

  const formatTime = (total) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0')
    const s = (total % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="audio-recorder-bar" onClick={e => e.stopPropagation()}>
      <button className="recorder-cancel-btn" onClick={handleCancel} title="Cancel">✕</button>

      <div className="recorder-live-waveform">
        {levels.map((h, i) => (
          <div key={i} className="recorder-bar" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="recorder-timer">
        {recording && <span className="recorder-dot" />}
        {formatTime(seconds)}
      </div>

      <button className="recorder-send-btn" onClick={handleSend} title="Send voice note">➤</button>
    </div>
  )
}

export default AudioRecorder
