import { EVIDENCE_GROUPS } from '../../config/uiCopy.js';
import { COMMUNITY_COPY } from '../../config/communityEvidence.js';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

function communityHeadline(status) {
  if (status === 'community_reviewed') return 'Community review recorded';
  if (status === 'requires_deliberation') return 'Requires deliberation';
  if (status === 'invalid') return 'Invalid evidence';
  return 'Not assessed';
}

export function SafeguardsStep({
  state,
  evidence,
  communityAssessment,
  planAlignment,
  canExport,
  onEvidence,
  onCommunity,
  onAlignment,
  onExport,
  onBack,
}) {
  const grouped = EVIDENCE_GROUPS.map((group) => ({
    ...group,
    count: group.ids.filter((id) => (evidence?.layers ?? []).some((layer) => layer.id === id)).length,
  }));
  const families = [...new Set((planAlignment?.entries ?? []).map((entry) => entry.intervention_type).filter(Boolean))];

  return (
    <StepShell
      state={state}
      actions={(
        <FlowActions
          backLabel="Back to review"
          onBack={onBack}
          onContinue={onExport}
          continueLabel="Export decision package"
          continueDisabled={!canExport}
          continueTestId="export-package"
        />
      )}
    >
      <p className="flow-banner" data-testid="package-ready">Decision package ready</p>

      <article className="choice-card static-card">
        <b>Evidence</b>
        <span>
          {grouped.find((item) => item.id === 'observed')?.count ?? 0} observed/official ·{' '}
          {grouped.find((item) => item.id === 'proxies')?.count ?? 0} proxies ·{' '}
          {grouped.find((item) => item.id === 'priors')?.count ?? 0} priors
        </span>
        <button type="button" className="flow-tertiary" data-testid="view-evidence" onClick={onEvidence}>
          View evidence and methods
        </button>
      </article>

      <article className="choice-card static-card">
        <b>Community review</b>
        <span data-testid="community-headline" data-status={communityAssessment?.validation_status}>
          {communityHeadline(communityAssessment?.validation_status)}
        </span>
        <small>{COMMUNITY_COPY.incomplete}</small>
        <button type="button" className="flow-tertiary" data-testid="record-community" onClick={onCommunity}>
          Record community evidence
        </button>
      </article>

      <article className="choice-card static-card">
        <b>Local alignment</b>
        <span>
          {planAlignment?.entries?.length ?? 0} references · {families.join(', ') || 'documented families'}
        </span>
        <small>{planAlignment?.geographic_scope}</small>
        <button type="button" className="flow-tertiary" data-testid="view-alignment" onClick={onAlignment}>
          View local evidence
        </button>
      </article>
    </StepShell>
  );
}
