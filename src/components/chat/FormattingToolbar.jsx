// A small floating toolbar shown above the composer whenever the user
// selects text, letting them apply WhatsApp-style formatting with a tap
// instead of needing to know the *bold*/_italic_/~strike~ symbols.

const FORMATS = [
  { key: 'bold', label: 'B', marker: '*', style: { fontWeight: 700 } },
  { key: 'italic', label: 'I', marker: '_', style: { fontStyle: 'italic' } },
  { key: 'strike', label: 'S', marker: '~', style: { textDecoration: 'line-through' } },
  { key: 'mono', label: '<>', marker: '```', style: { fontFamily: 'monospace' } },
]

const FormattingToolbar = ({ onFormat }) => {
  return (
    <div className="formatting-toolbar" onMouseDown={(e) => e.preventDefault()}>
      {FORMATS.map(f => (
        <button
          key={f.key}
          type="button"
          className="formatting-toolbar-btn"
          style={f.style}
          onClick={() => onFormat(f.marker)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

export default FormattingToolbar
