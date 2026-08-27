import {
  COMMUNITY_COPY,
  communityRecordKey,
  normalizeCommunityRecord,
  parseCommunityEvidenceFile,
  UNOBSERVED_COMMUNITY_RECORD,
} from '../config/communityEvidence.js';

function projectKey(project) {
  return `${Number(project.cell_id)}:${project.type}`;
}

function isAssessed(record) {
  return record?.consultation_status
    && record.consultation_status !== 'not_assessed';
}

function activatedSafeguards(record) {
  if (!record) return [];
  const flags = [];
  if (record.livelihood_disruption === 'high') {
    flags.push('livelihood_disruption');
  }
  if (record.displacement_risk === 'possible' || record.displacement_risk === 'required') {
    flags.push('displacement_risk');
  }
  if (
    record.accessibility_concern === 'possible'
    || record.accessibility_concern === 'confirmed'
  ) {
    flags.push('accessibility_concern');
  }
  if (record.community_position === 'oppose') {
    flags.push('community_opposition');
  }
  if (record.maintenance_capacity === 'low') {
    flags.push('maintenance_capacity');
  }
  return flags;
}

function mergeRecords(fileRecords, sessionRecords) {
  const byKey = new Map();
  for (const record of fileRecords) {
    byKey.set(communityRecordKey(record), record);
  }
  for (const record of sessionRecords) {
    byKey.set(communityRecordKey(record), record);
  }
  return byKey;
}

export function resolveCommunityRecord(project, recordMap) {
  const exact = recordMap.get(projectKey(project));
  if (exact) return exact;
  const cellOnly = recordMap.get(`${Number(project.cell_id)}:`);
  if (cellOnly) return cellOnly;
  return {
    ...UNOBSERVED_COMMUNITY_RECORD,
    cell_id: Number(project.cell_id),
    intervention_type: project.type,
    origin: 'unobserved',
  };
}

export function assessCommunitySafeguards({
  projects = [],
  communityFile = null,
  sessionRecords = [],
} = {}) {
  const parsed = parseCommunityEvidenceFile(communityFile);
  const fileRecords = parsed.template ? [] : parsed.records;
  const normalizedSession = sessionRecords
    .map((item) =>
      normalizeCommunityRecord(item, { fallbackOrigin: 'participatory_session' }),
    )
    .filter(Boolean);
  const recordMap = mergeRecords(fileRecords, normalizedSession);
  const portfolio = (projects ?? []).map((project) => {
    const record = resolveCommunityRecord(project, recordMap);
    const safeguards = activatedSafeguards(record);
    return {
      cell_id: Number(project.cell_id),
      type: project.type,
      record,
      assessed: isAssessed(record),
      safeguards,
    };
  });

  const notAssessed = portfolio.filter((item) => !item.assessed);
  const safeguards = [...new Set(portfolio.flatMap((item) => item.safeguards))];
  const unresolvedConcerns = portfolio
    .filter((item) => item.safeguards.length)
    .map((item) => ({
      cell_id: item.cell_id,
      type: item.type,
      safeguards: item.safeguards,
      community_position: item.record.community_position,
      origin: item.record.origin,
    }));

  let validationStatus = 'not_assessed';
  if (!portfolio.length) {
    validationStatus = 'not_assessed';
  } else if (safeguards.length) {
    validationStatus = 'requires_deliberation';
  } else if (notAssessed.length === portfolio.length) {
    validationStatus = 'not_assessed';
  } else if (notAssessed.length) {
    validationStatus = 'incomplete';
  } else {
    validationStatus = 'community_reviewed';
  }

  return {
    file_status: parsed.status,
    template_ignored: parsed.template,
    validation_status: validationStatus,
    validation_label:
      validationStatus === 'requires_deliberation'
        ? COMMUNITY_COPY.requiresDeliberation
        : validationStatus === 'community_reviewed'
          ? COMMUNITY_COPY.reviewed
          : validationStatus === 'incomplete'
            ? COMMUNITY_COPY.incompleteStatus
            : COMMUNITY_COPY.technicallyOnly,
    project_count: portfolio.length,
    not_assessed_count: notAssessed.length,
    not_assessed_projects: notAssessed.map((item) => ({
      cell_id: item.cell_id,
      type: item.type,
    })),
    safeguards_activated: safeguards,
    unresolved_concerns: unresolvedConcerns,
    records: portfolio.map((item) => item.record),
    participatory_records: normalizedSession,
    guardrail: COMMUNITY_COPY.notAPrediction,
  };
}

export function emptyCommunityAssessment(projects = []) {
  return assessCommunitySafeguards({ projects, communityFile: null, sessionRecords: [] });
}
