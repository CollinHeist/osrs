export default function InsightList({ title, description, rows, emptyText, tone = '' }) {
  return (
    <section className={`insight-panel ${tone}`}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      {rows.length === 0 ? (
        <div className="insight-empty">{emptyText}</div>
      ) : (
        <ol className="insight-rows">
          {rows.map((row, index) => (
            <li key={row.key}>
              <button type="button" onClick={row.onClick}>
                <span className="insight-rank">{index + 1}</span>
                <img src={row.imageUrl} alt="" />
                <span className="insight-copy">
                  <strong>{row.title}</strong>
                  <small>{row.subtitle}</small>
                </span>
                <span className="insight-value">
                  <b>{row.value}</b>
                  <small>{row.detail}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
