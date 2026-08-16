export default function MetricCard({ label, value, detail, tone = '' }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {detail && <span className="metric-detail">{detail}</span>}
    </div>
  )
}
