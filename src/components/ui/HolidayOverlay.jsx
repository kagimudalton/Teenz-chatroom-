import { useMemo } from 'react'

const PARTICLE_COUNT = 18

const HolidayOverlay = ({ particle }) => {
  const particles = useMemo(() => (
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 6,
      size: 0.8 + Math.random() * 1.2,
    }))
  ), [])

  return (
    <div className="holiday-overlay" aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className="holiday-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
          }}
        >
          {particle}
        </span>
      ))}
    </div>
  )
}

export default HolidayOverlay
