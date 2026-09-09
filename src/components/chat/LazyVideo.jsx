import { useRef, useState, useEffect } from 'react'

// Only sets a real `src` on the <video> once it's actually scrolled into view,
// so videos further down a long chat history don't all start loading at once.
const LazyVideo = ({ src, className, ...rest }) => {
  const videoRef = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el || inView) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // start loading slightly before it's fully visible
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  return (
    <video
      ref={videoRef}
      src={inView ? src : undefined}
      controls
      preload={inView ? 'metadata' : 'none'}
      className={className}
      {...rest}
    />
  )
}

export default LazyVideo
