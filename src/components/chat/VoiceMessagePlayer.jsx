import { useState, useRef, useEffect } from 'react'

const BAR_COUNT = 28

// Cache decoded peaks per URL so re-renders / re-mounts don't re-fetch and re-decode audio.
const peaksCache = new Map()

const decodePeaks = async (url) => {
  if (peaksCache.has(url)) return peaksCache.get(url)

  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const audioCtx = new AudioCtx()
  try {
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    const rawData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(rawData.length / BAR_COUNT)
    const peaks = []
    for (let i = 0; i < BAR_COUNT; i++) {
      const start = i * blockSize
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j] || 0)
      }
      peaks.push(sum / blockSize)
    }
    const max = Math.max(...peaks, 0.0001)
    const normalized = peaks.map(p => Math.max(8, (p / max) * 100))
    peaksCache.set(url, normalized)
    return normalized
  } finally {
    audioCtx.close().catch(() => {})
  }
}

const VoiceMessagePlayer = ({ mediaURL }) => {
  const [peaks, setPeaks] = useState(Array(BAR_COUNT).fill(20))
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 1
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const rafRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    decodePeaks(mediaURL).then(p => { if (mountedRef.current) setPeaks(p) }).catch(() => {})
    return () => { mountedRef.current = false }
  }, [mediaURL])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  const tick = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.duration) setProgress(audio.currentTime / audio.duration)
    if (!audio.paused) rafRef.current = requestAnimationFrame(tick)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    } else {
      audio.pause()
      setIsPlaying(false)
      cancelAnimationFrame(rafRef.current)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    cancelAnimationFrame(rafRef.current)
  }

  const handleSeek = (index) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = (index / BAR_COUNT) * duration
    setProgress(index / BAR_COUNT)
  }

  const formatDuration = (secs) => {
    if (!secs || !isFinite(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const activeBarIndex = Math.floor(progress * BAR_COUNT)

  return (
    <div className="msg-audio-player">
      <button className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <audio
        ref={audioRef}
        src={mediaURL}
        style={{ display: 'none' }}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div className="audio-waveform">
        {peaks.map((h, i) => (
          <div
            key={i}
            className={`waveform-bar ${i <= activeBarIndex && isPlaying ? 'played' : ''} ${i <= activeBarIndex && !isPlaying && progress > 0 ? 'played' : ''}`}
            style={{ height: `${h}%` }}
            onClick={() => handleSeek(i)}
          />
        ))}
      </div>
      <span className="audio-duration">{formatDuration(duration)}</span>
    </div>
  )
}

export default VoiceMessagePlayer
