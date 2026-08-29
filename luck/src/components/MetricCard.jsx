export default function MetricCard({
  label,
  value,
  detail,
  tone = '',
  popover,
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-heading">
        <span className="metric-label">{label}</span>
        {popover && (
          <details className="metric-popover">
            <summary aria-label={`More information about ${label}`}>?</summary>
            <div className="metric-popover-content">
              {popover}
            </div>
          </details>
        )}
      </div>
      <strong>{value}</strong>
      {detail && <span className="metric-detail">{detail}</span>}
    </div>
  )
}
