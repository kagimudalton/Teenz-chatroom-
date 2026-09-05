// Parses WhatsApp-style formatting markers in message text:
// *bold*, _italic_, ~strikethrough~, ```monospace```
// Renders styled spans instead of the raw markers.

const FormattedText = ({ text }) => {
  if (!text) return null

  const tokens = tokenize(text)

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold':
            return <strong key={i}>{token.content}</strong>
          case 'italic':
            return <em key={i}>{token.content}</em>
          case 'strike':
            return <s key={i}>{token.content}</s>
          case 'mono':
            return <code key={i} className="msg-mono">{token.content}</code>
          default:
            return <span key={i}>{token.content}</span>
        }
      })}
    </>
  )
}

// Simple single-pass tokenizer. Markers cannot be nested (matches WhatsApp behavior).
const tokenize = (text) => {
  const pattern = /```([^`]+)```|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g
  const tokens = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', content: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) tokens.push({ type: 'mono', content: match[1] })
    else if (match[2] !== undefined) tokens.push({ type: 'bold', content: match[2] })
    else if (match[3] !== undefined) tokens.push({ type: 'italic', content: match[3] })
    else if (match[4] !== undefined) tokens.push({ type: 'strike', content: match[4] })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'plain', content: text.slice(lastIndex) })
  }

  return tokens.length ? tokens : [{ type: 'plain', content: text }]
}

export default FormattedText
