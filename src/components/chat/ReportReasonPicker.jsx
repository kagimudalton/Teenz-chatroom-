const REASONS = [
  'Spam',
  'Harassment or bullying',
  'Explicit or inappropriate content',
  'Hate speech',
  'Scam or fraud',
  'Something else',
]

const ReportReasonPicker = ({ onSelect, onClose }) => {
  return (
    <div className="report-reason-overlay" onClick={onClose}>
      <div className="report-reason-card" onClick={e => e.stopPropagation()}>
        <h3>Report this message</h3>
        <p>Why are you reporting it?</p>
        {REASONS.map(reason => (
          <button key={reason} className="report-reason-item" onClick={() => onSelect(reason)}>
            {reason}
          </button>
        ))}
        <button className="report-reason-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default ReportReasonPicker
