export function formatNumber(value, maximumFractionDigits = 0) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

export function formatPercent(value, digits = 1, trimTrailingZeros = false) {
  if (!Number.isFinite(value)) return '—'
  const thresholdDigits = Math.max(2, digits)
  const minimumPercent = 10 ** -thresholdDigits
  const percent = value * 100
  if (value > 0 && percent < minimumPercent) {
    return `<${minimumPercent.toFixed(thresholdDigits)}%`
  }
  if (value < 1 && percent > 100 - minimumPercent) {
    return `>${(100 - minimumPercent).toFixed(thresholdDigits)}%`
  }
  const formatted = percent.toFixed(digits)
  return `${trimTrailingZeros ? Number(formatted) : formatted}%`
}

export function formatRate(rate) {
  const [numerator, denominator] = rate
  return numerator === 1
    ? `1/${formatNumber(denominator)}`
    : `${formatNumber(numerator)}/${formatNumber(denominator)}`
}

export function formatDuration(hours) {
  if (hours === null || !Number.isFinite(hours)) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 100) return `${formatNumber(hours, 1)} hr`
  return `${formatNumber(hours)} hr`
}
