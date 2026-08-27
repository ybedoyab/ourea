export const CONSULTATION_STATUS = Object.freeze([
  'not_assessed',
  'planned',
  'in_progress',
  'validated',
]);

export const COMMUNITY_POSITION = Object.freeze([
  'unknown',
  'support',
  'mixed',
  'oppose',
]);

export const IMPACT_LEVEL = Object.freeze([
  'unknown',
  'low',
  'medium',
  'high',
]);

export const DISPLACEMENT_RISK = Object.freeze([
  'unknown',
  'none',
  'possible',
  'required',
]);

export const ACCESSIBILITY_CONCERN = Object.freeze([
  'unknown',
  'none',
  'possible',
  'confirmed',
]);

export const EVIDENCE_TYPE = Object.freeze([
  'none',
  'participatory_input',
  'official_record',
  'field_observation',
  'research',
]);

export const COMMUNITY_FIELD_OPTIONS = Object.freeze({
  consultation_status: CONSULTATION_STATUS,
  community_position: COMMUNITY_POSITION,
  livelihood_disruption: IMPACT_LEVEL,
  maintenance_capacity: IMPACT_LEVEL,
  displacement_risk: DISPLACEMENT_RISK,
  accessibility_concern: ACCESSIBILITY_CONCERN,
  evidence_type: EVIDENCE_TYPE,
});

export const UNOBSERVED_COMMUNITY_RECORD = Object.freeze({
  consultation_status: 'not_assessed',
  community_position: 'unknown',
  livelihood_disruption: 'unknown',
  maintenance_capacity: 'unknown',
  displacement_risk: 'unknown',
  accessibility_concern: 'unknown',
  evidence_type: 'none',
  source: null,
  as_of: null,
  notes: null,
});

export const COMMUNITY_COPY = Object.freeze({
  title: 'Community evidence & safeguards',
  heading: 'Technically robust does not mean community-validated.',
  incomplete:
    'Community evidence is currently incomplete. Final implementation requires deliberation with affected residents, technical experts and responsible authorities.',
  notAPrediction:
    'These records are evidence and safeguards. They are not a prediction of community acceptance.',
  participatoryLabel: 'Participatory scenario input',
  participatoryHint:
    'Values entered here are session notes from co-design, not official observations unless a source is attached.',
  missingFile:
    'No community-evidence file is loaded. Every project is treated as not assessed.',
  requiresDeliberation: 'Requires deliberation',
  technicallyOnly: 'Technically evaluated only',
  notAssessed: 'Not assessed',
  incompleteStatus: 'Incomplete community evidence',
  reviewed: 'Community review recorded',
});

export function communityRecordKey(record) {
  const cellId = Number(record?.cell_id);
  const type = String(record?.intervention_type ?? '');
  return `${cellId}:${type}`;
}

export function isAllowedCommunityValue(field, value) {
  const options = COMMUNITY_FIELD_OPTIONS[field];
  return Boolean(options?.includes(value));
}

export function normalizeCommunityRecord(raw, { fallbackOrigin = 'unobserved' } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const cellId = Number(raw.cell_id);
  if (!Number.isFinite(cellId)) return null;

  const interventionType =
    raw.intervention_type == null || raw.intervention_type === ''
      ? null
      : String(raw.intervention_type);

  const record = {
    cell_id: cellId,
    intervention_type: interventionType,
    consultation_status: isAllowedCommunityValue(
      'consultation_status',
      raw.consultation_status,
    )
      ? raw.consultation_status
      : UNOBSERVED_COMMUNITY_RECORD.consultation_status,
    community_position: isAllowedCommunityValue(
      'community_position',
      raw.community_position,
    )
      ? raw.community_position
      : UNOBSERVED_COMMUNITY_RECORD.community_position,
    livelihood_disruption: isAllowedCommunityValue(
      'livelihood_disruption',
      raw.livelihood_disruption,
    )
      ? raw.livelihood_disruption
      : UNOBSERVED_COMMUNITY_RECORD.livelihood_disruption,
    maintenance_capacity: isAllowedCommunityValue(
      'maintenance_capacity',
      raw.maintenance_capacity,
    )
      ? raw.maintenance_capacity
      : UNOBSERVED_COMMUNITY_RECORD.maintenance_capacity,
    displacement_risk: isAllowedCommunityValue(
      'displacement_risk',
      raw.displacement_risk,
    )
      ? raw.displacement_risk
      : UNOBSERVED_COMMUNITY_RECORD.displacement_risk,
    accessibility_concern: isAllowedCommunityValue(
      'accessibility_concern',
      raw.accessibility_concern,
    )
      ? raw.accessibility_concern
      : UNOBSERVED_COMMUNITY_RECORD.accessibility_concern,
    evidence_type: isAllowedCommunityValue('evidence_type', raw.evidence_type)
      ? raw.evidence_type
      : UNOBSERVED_COMMUNITY_RECORD.evidence_type,
    source: raw.source ? String(raw.source) : null,
    as_of: raw.as_of ? String(raw.as_of) : null,
    notes: raw.notes ? String(raw.notes) : null,
    origin: raw.origin ?? fallbackOrigin,
  };

  if (record.origin === 'participatory_session') {
    record.evidence_type = 'participatory_input';
  }

  return record;
}

export function parseCommunityEvidenceFile(payload) {
  if (payload == null) {
    return {
      schema: 'ourea-community-evidence',
      schema_version: 1,
      status: 'absent',
      template: false,
      records: [],
    };
  }

  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.records)
      ? payload.records
      : [];

  return {
    schema: payload.schema ?? 'ourea-community-evidence',
    schema_version: Number(payload.schema_version) || 1,
    status: payload.status ?? 'loaded',
    template: Boolean(payload.template),
    note: payload.note ?? null,
    records: records
      .map((item) =>
        normalizeCommunityRecord(item, { fallbackOrigin: 'file' }),
      )
      .filter(Boolean),
  };
}
