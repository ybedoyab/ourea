import { EVIDENCE_GROUPS } from '../config/uiCopy.js';
import { SectionHeading } from './SectionHeading.jsx';

const STATUS_LABELS = {
  'observed-official': 'Observed / official',
  'official-derived-layer': 'Official derived layer',
  'official-cadastral': 'Official cadastral',
  'census-based-proxy': 'Census proxy',
  'official-spatial-proxy': 'Official spatial proxy',
  'official-network-proxy': 'Official network proxy',
  'explicit-planning-priors': 'Explicit planning priors',
  'observed-gridded-climatology': 'Observed gridded climatology',
  'planning-credits': 'Planning credits',
  'official-projection': 'Official projection',
  'official-social-index': 'Official social index',
  'derived-screening-proxy': 'Derived screening proxy',
};

export function EvidencePanel({ evidence }) {
  if (!evidence) return null;

  const byId = new Map((evidence.layers ?? []).map((item) => [item.id, item]));
  const grouped = EVIDENCE_GROUPS.map((group) => ({
    ...group,
    layers: group.ids.map((id) => byId.get(id)).filter(Boolean),
  })).filter((group) => group.layers.length);

  const leftover = (evidence.layers ?? []).filter(
    (item) => !EVIDENCE_GROUPS.some((group) => group.ids.includes(item.id)),
  );
  if (leftover.length) {
    grouped.push({ id: 'other', label: 'Other', layers: leftover });
  }

  return (
    <section>
      <SectionHeading step={8} title="Inspect evidence">
        Observed layers, planning proxies and uncalibrated priors stay explicitly labeled.
      </SectionHeading>

      {grouped.map((group) => (
        <div className="evidence-group" key={group.id}>
          <div className="evidence-group-label">{group.label}</div>
          <div className="evidence-grid">
            {group.layers.map((item) => (
              <div className="evidence-item" key={item.id}>
                <div className="evidence-title">
                  <b>{item.label}</b>
                  <span className={`status-badge status-${item.status}`}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <span>{item.basis}</span>
                <small>{item.use}</small>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
