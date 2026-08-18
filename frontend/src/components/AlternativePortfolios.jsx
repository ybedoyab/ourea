import { INTERVENTIONS } from '../config/modelConfig.js';
import { policyConsensus } from '../domain/alternatives.js';

function score(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—';
}

export function AlternativePortfolios({
  alternatives,
  selectedProfileId,
  busy,
  error,
  onGenerate,
  onSelect,
}) {
  const consensus = policyConsensus(alternatives);
  const consensusCore = consensus.filter((item) => item.consensus);
  const recommendedId = alternatives?.length
    ? [...alternatives].sort(
        (a, b) =>
          b.uncertainty.p10 - a.uncertainty.p10 ||
          b.downsideRetention - a.downsideRetention,
      )[0]?.profileId
    : null;

  return (
    <div className="alternative-box">
      <div className="alternative-head">
        <div>
          <b>OUREA robust options</b>
          <span>
            Four transparent policy lenses. Same data and budget — different public-policy weights.
          </span>
        </div>
        <button type="button" onClick={onGenerate} className="primary" disabled={busy}>
          {busy
            ? 'Generating…'
            : alternatives?.length
              ? 'Regenerate options'
              : 'Generate robust options'}
        </button>
      </div>

      {error && (
        <div className="analysis-error" role="alert">
          Alternative portfolio generation failed: {error}
        </div>
      )}

      {!alternatives?.length && !busy && !error && (
        <p className="empty-note">
          Generate robust options to compare Balanced, Equity-first, Access-first and Low-regret
          portfolios.
        </p>
      )}

      {alternatives?.length > 0 && (
        <div className="alternative-grid">
          {alternatives.map((option) => {
            const active = option.profileId === selectedProfileId;
            const highestP10 = option.profileId === recommendedId;
            return (
              <button
                key={option.profileId}
                type="button"
                className={active ? 'alternative-card active' : 'alternative-card'}
                onClick={() => onSelect(option.profileId)}
                aria-pressed={active}
              >
                <div className="alternative-title">
                  <b>{option.profile.label}</b>
                  <div>
                    {highestP10 && <em>Highest P10 in current ensemble</em>}
                    <i>{option.spentCredits} cr</i>
                  </div>
                </div>
                <span>{option.profile.description}</span>
                <div className="alternative-stats">
                  <small>
                    <b>{option.plan.length}</b>
                    projects
                  </small>
                  <small>
                    <b>{score(option.uncertainty.p10)}</b>
                    P10
                  </small>
                  <small>
                    <b>{score(option.uncertainty.median)}</b>
                    median
                  </small>
                  <small>
                    <b>{score(option.deterministic.equityBenefit)}</b>
                    equity proxy
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {consensus.length > 0 && (
        <div className="policy-consensus">
          <div>
            <b>Policy consensus</b>
            <span>
              {consensusCore.length} project{consensusCore.length === 1 ? '' : 's'} selected by all {alternatives.length} lenses
            </span>
          </div>
          <div className="policy-consensus-list">
            {consensus.slice(0, 6).map((item) => (
              <i key={`${item.cell_id}:${item.type}`} className={item.consensus ? 'core' : ''}>
                {INTERVENTIONS[item.type]?.short ?? item.type} · cell {item.cell_id} · {item.policyCount}/{alternatives.length}
              </i>
            ))}
          </div>
        </div>
      )}

      <small className="alternative-note">
        “Highest P10 in current ensemble” means strongest lower-tail benefit proxy in this
        development draw, not universal optimality. Policy weights remain explicit settings and
        should be co-designed with decision-makers.
      </small>
    </div>
  );
}
