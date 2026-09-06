// A small built-in pack of animated stickers (pure CSS/SVG, no external assets).
// Each sticker has a unique id used when sending, and a looping animation class.

export const STICKERS = [
  { id: 'heart-beat', emoji: '❤️', animClass: 'sticker-anim-beat' },
  { id: 'thumbs-bounce', emoji: '👍', animClass: 'sticker-anim-bounce' },
  { id: 'fire-flicker', emoji: '🔥', animClass: 'sticker-anim-flicker' },
  { id: 'clap-pulse', emoji: '👏', animClass: 'sticker-anim-pulse' },
  { id: 'party-spin', emoji: '🎉', animClass: 'sticker-anim-spin' },
  { id: 'laugh-shake', emoji: '😂', animClass: 'sticker-anim-shake' },
  { id: 'star-twinkle', emoji: '⭐', animClass: 'sticker-anim-twinkle' },
  { id: 'wave-swing', emoji: '👋', animClass: 'sticker-anim-swing' },
]

export const getStickerById = (id) => STICKERS.find(s => s.id === id) || STICKERS[0]

const StickerPicker = ({ onSelect, onClose }) => {
  return (
    <div className="sticker-picker" onClick={e => e.stopPropagation()}>
      <div className="sticker-picker-header">
        <span>Stickers</span>
        <button className="emoji-close" onClick={onClose}>✕</button>
      </div>
      <div className="sticker-picker-grid">
        {STICKERS.map(sticker => (
          <button
            key={sticker.id}
            className="sticker-picker-item"
            onClick={() => onSelect(sticker.id)}
          >
            <span className={`sticker-display ${sticker.animClass}`}>{sticker.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default StickerPicker
