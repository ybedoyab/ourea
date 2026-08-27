export function BenchmarkPanel({
  benchmark,
  breakage,
  busy,
  error,
  onAnalyze,
}) {
  return (
    <div className="benchmark-box" data-testid="benchmark-panel">
      <div className="frontier-header">
        <div>
          <b>Selection benchmark</b>
          <span>
            Hazard-only versus a one-scenario deterministic plan versus Ourea robust, under the
            same budget and comparison seed.
          </span>
        </div>
        <button
          type="button"
          data-testid="analyze-benchmark"
          onClick={onAnalyze}
          disabled={busy}
        >
          {busy ? 'Comparing…' : benchmark ? 'Recompute' : 'Compare selection rules'}
        </button>
      </div>

      {error && (
        <div className="analysis-error" role="alert">
          Benchmark failed: {error}
        </div>
      )}

      {benchmark?.strategies && (
        <div className="frontier-table">
          {benchmark.strategies.map((item) => (
            <div key={item.id} className="frontier-row">
              <b>{item.id.replaceAll('_', ' ')}</b>
              <span>{item.budgetFeasible ? 'feasible' : 'over budget'}</span>
              <span>{item.projectCount} projects</span>
              <span>median {item.median.toFixed(1)}</span>
              <span>P10 {item.p10.toFixed(1)}</span>
              <span>P10 regret {item.p10RegretVersusRobust.toFixed(1)}</span>
              <span>overlap {Math.round(item.overlapWithRobust * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {breakage && (
        <div className="breakage-box" data-testid="breakage-panel">
          <b>What breaks this portfolio?</b>
          <span>
            Deterministic sensitivity on rain, wetness and restoration maturity. Threshold is
            {` ${Math.round(breakage.thresholdRatio * 100)}% `}
            of the reference benefit proxy.
          </span>
          <span>{breakage.breaches.length} grid cells fall below the threshold.</span>
          {breakage.influentialAssumptions.map((item) => (
            <span key={item.assumption}>
              {item.assumption.replaceAll('_', ' ')}: Δ {item.deltaBenefit.toFixed(1)}
            </span>
          ))}
          <small>{breakage.note}</small>
        </div>
      )}
    </div>
  );
}
