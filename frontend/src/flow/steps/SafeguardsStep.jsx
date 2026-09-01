import { AI_REVIEW_COPY } from '../../config/aiReview.js';
import { EVIDENCE_GROUPS } from '../../config/uiCopy.js';
import { COMMUNITY_COPY } from '../../config/communityEvidence.js';
import { INTERVENTIONS } from '../../config/modelConfig.js';
import { AiDecisionReviewSummary } from '../../components/AiDecisionReviewCard.jsx';
import { CellPlaceLinks } from '../../components/CellPlaceLinks.jsx';
import { HillsideMechanismAnimation } from '../../components/HillsideMechanismAnimation.jsx';
import { EvidenceIcon, CommunityIcon, AlignmentIcon, DownloadIcon } from '../../components/FlowIcons.jsx';
import { featureLngLat } from '../../domain/placeLinks.js';
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
  projects,
  cells,
  canExport,
  readiness,
  review,
  onEvidence,
  onCommunity,
  onAlignment,
  onExport,
  onBack,
  onSelectCell,
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
          continueLabel={review?.status === 'loading' ? AI_REVIEW_COPY.preparingPdf : 'Download PDF'}
          continueDisabled={!canExport || review?.status === 'loading'}
          continueTestId="export-package"
        />
      )}
    >
      <p className="flow-banner" data-testid="package-ready">Ready to take this decision to a meeting</p>
      {review?.status === 'loading' && (
        <p className="hint pdf-export-loading" role="status" data-testid="pdf-export-loading">{AI_REVIEW_COPY.preparingPdf}</p>
      )}
      <AiDecisionReviewSummary readiness={readiness} review={review} />
      <p className="hint">
        <span className="label-with-icon"><DownloadIcon /> Downloads a formatted PDF proposal for the meeting.</span>
      </p>

      <HillsideMechanismAnimation />

      {(projects ?? []).length > 0 && (
        <article className="choice-card static-card" data-testid="cell-place-list">
          <b>Open a recommended cell</b>
          <span>See it on this map, or jump to the same square in Google Maps or Google Earth.</span>
          <ul className="cell-place-list">
            {projects.map((project) => {
              const feature = (cells?.features ?? []).find(
                (item) => Number(item.properties.cell_id) === Number(project.cell_id),
              );
              const centroid = featureLngLat(feature);
              return (
                <li key={`${project.cell_id}:${project.type}`}>
                  <strong>Cell {project.cell_id}</strong>
                  <span>{INTERVENTIONS[project.type]?.label ?? project.type}</span>
                  <CellPlaceLinks
                    lat={centroid?.[1]}
                    lng={centroid?.[0]}
                    onSeeOnMap={() => onSelectCell?.(Number(project.cell_id))}
                  />
                </li>
              );
            })}
          </ul>
        </article>
      )}

      <article className="choice-card static-card">
        <span className="choice-icon"><EvidenceIcon /></span>
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
        <span className="choice-icon"><CommunityIcon /></span>
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
        <span className="choice-icon"><AlignmentIcon /></span>
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
