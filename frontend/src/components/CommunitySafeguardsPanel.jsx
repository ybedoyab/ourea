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
  evidence_type: 'Evidence type',
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
    evidence_type: 'participatory_input',
    source: COMMUNITY_COPY.participatoryLabel,
    as_of: new Date().toISOString().slice(0, 10),
    process_reference: '',
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
      process_reference: draft.process_reference || null,
    });
  }

  if (!assessment) return null;

  return (
    <section className="community-panel" data-testid="community-panel">
      <SectionHeading step={9} title={COMMUNITY_COPY.title}>
        {COMMUNITY_COPY.heading}
      </SectionHeading>

      <div
        className={`community-banner status-${assessment.validation_status}`}
        role="status"
        data-testid="community-status"
        data-status={assessment.validation_status}
      >
        <b>{assessment.validation_label}</b>
        <span>
          {assessment.not_assessed_count} of {assessment.project_count || 0} selected
          projects are {COMMUNITY_COPY.notAssessed.toLowerCase()}.
        </span>
      </div>

      {assessment.validation_status === 'invalid' && (
        <p className="warning" role="alert" data-testid="community-invalid">
          {COMMUNITY_COPY.invalidFile}
        </p>
      )}
      {assessment.file_errors?.length > 0 && (
        <ul data-testid="community-file-errors">
          {assessment.file_errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {(assessment.validation_status === 'not_assessed'
        || assessment.validation_status === 'incomplete') && (
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
      <p className="hint" role="note">{COMMUNITY_COPY.privacy}</p>

      <form className="community-form" onSubmit={submitRecord} data-testid="community-form">
        <div className="community-form-label">{COMMUNITY_COPY.participatoryLabel}</div>
        <p className="hint">{COMMUNITY_COPY.participatoryHint}</p>

        <label>
          Selected project
          <select
            aria-label="Project for community evidence"
            data-testid="community-project"
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
              data-testid={`community-${field}`}
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
          Source
          <input
            type="text"
            aria-label="Community evidence source"
            data-testid="community-source"
            value={draft.source}
            onChange={(event) =>
              setDraft((current) => ({ ...current, source: event.target.value }))
            }
          />
        </label>

        <label>
          As of
          <input
            type="date"
            aria-label="Community evidence as-of date"
            data-testid="community-as-of"
            value={draft.as_of}
            onChange={(event) =>
              setDraft((current) => ({ ...current, as_of: event.target.value }))
            }
          />
        </label>

        <label>
          Process or source reference
          <input
            type="text"
            aria-label="Process or source reference"
            value={draft.process_reference}
            onChange={(event) =>
              setDraft((current) => ({ ...current, process_reference: event.target.value }))
            }
          />
        </label>

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

        <button
          type="submit"
          data-testid="community-submit"
          disabled={!selectedOptions.length || draft.cell_id === ''}
        >
          Record participatory input
        </button>
      </form>
    </section>
  );
}
