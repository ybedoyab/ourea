import { useMemo, useState } from 'react';
import {
  COMMUNITY_COPY,
  COMMUNITY_FIELD_OPTIONS,
} from '../config/communityEvidence.js';
import { SectionHeading } from './SectionHeading.jsx';

const FIELD_LABELS = {
  consultation_status: 'Consultation',
  community_position: 'Community position',
  livelihood_disruption: 'Livelihood disruption',
  maintenance_capacity: 'Maintenance capacity',
  displacement_risk: 'Displacement risk',
  accessibility_concern: 'Accessibility concern',
};

function labelize(value) {
  return String(value ?? '').replaceAll('_', ' ');
}

export function CommunitySafeguardsPanel({
  assessment,
  activePlan,
  onRecord,
}) {
  const projects = activePlan ?? [];
  const [draft, setDraft] = useState({
    cell_id: '',
    intervention_type: '',
    consultation_status: 'in_progress',
    community_position: 'unknown',
    livelihood_disruption: 'unknown',
    maintenance_capacity: 'unknown',
    displacement_risk: 'unknown',
    accessibility_concern: 'unknown',
    notes: '',
  });

  const selectedOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: `${project.cell_id}:${project.type}`,
        label: `Cell ${project.cell_id} · ${project.type}`,
        cell_id: project.cell_id,
        type: project.type,
      })),
    [projects],
  );

  function submitRecord(event) {
    event.preventDefault();
    if (draft.cell_id === '' || !draft.intervention_type) return;
    onRecord?.({
      ...draft,
      cell_id: Number(draft.cell_id),
      as_of: new Date().toISOString().slice(0, 10),
      source: COMMUNITY_COPY.participatoryLabel,
    });
  }

  if (!assessment) return null;

  const technicallyOnly =
    assessment.validation_status === 'not_assessed'
    || assessment.validation_status === 'incomplete';

  return (
    <section className="community-panel">
      <SectionHeading step={8} title={COMMUNITY_COPY.title}>
        {COMMUNITY_COPY.heading}
      </SectionHeading>

      <div
        className={`community-banner status-${assessment.validation_status}`}
        role="status"
      >
        <b>{assessment.validation_label}</b>
        <span>
          {assessment.not_assessed_count} of {assessment.project_count || 0} selected
          projects are {COMMUNITY_COPY.notAssessed.toLowerCase()}.
        </span>
      </div>

      {technicallyOnly && (
        <p className="warning" role="note">
          {COMMUNITY_COPY.incomplete}
        </p>
      )}

      {assessment.file_status === 'absent' && (
        <p className="hint">{COMMUNITY_COPY.missingFile}</p>
      )}

      {assessment.unresolved_concerns.length > 0 && (
        <div className="community-concerns">
          <b>Open safeguards</b>
          {assessment.unresolved_concerns.map((item) => (
            <span key={`${item.cell_id}:${item.type}`}>
              Cell {item.cell_id} · {item.type}: {item.safeguards.map(labelize).join(', ')}
            </span>
          ))}
        </div>
      )}

      <p className="hint">{COMMUNITY_COPY.notAPrediction}</p>

      <form className="community-form" onSubmit={submitRecord}>
        <div className="community-form-label">{COMMUNITY_COPY.participatoryLabel}</div>
        <p className="hint">{COMMUNITY_COPY.participatoryHint}</p>

        <label>
          Selected project
          <select
            aria-label="Project for community evidence"
            value={draft.cell_id === '' ? '' : `${draft.cell_id}:${draft.intervention_type}`}
            onChange={(event) => {
              const [cellId, type] = event.target.value.split(':');
              setDraft((current) => ({
                ...current,
                cell_id: cellId,
                intervention_type: type,
              }));
            }}
            disabled={!selectedOptions.length}
          >
            <option value="">Choose a selected project</option>
            {selectedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <label key={field}>
            {label}
            <select
              aria-label={label}
              value={draft[field]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
            >
              {COMMUNITY_FIELD_OPTIONS[field].map((option) => (
                <option key={option} value={option}>
                  {labelize(option)}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label>
          Notes
          <input
            type="text"
            aria-label="Community evidence notes"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </label>

        <button type="submit" disabled={!selectedOptions.length || draft.cell_id === ''}>
          Record participatory input
        </button>
      </form>
    </section>
  );
}
