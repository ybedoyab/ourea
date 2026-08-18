export function Metric({ label, value, hint, tone }) {
  return (
    <div className={tone ? `metric metric-${tone}` : 'metric'} title={hint || undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MetricGroup({ label, children }) {
  return (
    <div className="metric-group">
      <div className="metric-group-label">{label}</div>
      <div className="metric-group-grid">{children}</div>
    </div>
  );
}
