import { useMemo, useState } from 'react';
import { SectionHeading } from './SectionHeading.jsx';

function formatMillimeters(value) {
  return value == null || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(1)} mm`;
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  });
}

export function ReplayPanel({ replay, contract }) {
  const timeline = replay?.timeline ?? [];
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(Math.max(0, index), Math.max(0, timeline.length - 1));
  const current = timeline[safeIndex] ?? null;

  const range = useMemo(() => {
    if (!timeline.length) return null;
    return {
      start: timeline[0].timestamp,
      end: timeline[timeline.length - 1].timestamp,
    };
  }, [timeline]);

  if (!timeline.length) {
    const required = contract?.historical_replay?.required_features ?? [
      '1h', '6h', '24h', '3d', '7d', '15d',
    ];
    return (
      <section>
        <SectionHeading title="Historical calibration bridge">
          Official SIATA rainfall remains pending. No synthetic series is shipped.
        </SectionHeading>
        <div className="replay-status pending">
          <span>Status</span>
          <b>Awaiting requested SIATA raw rainfall series</b>
        </div>
        <p className="hint">
          Target: June 2022 El Faro–Altos de La Torre hindcast. The ingestion adapter and UI
          contract are already implemented.
        </p>
        <div className="feature-kicker">Ready pipeline</div>
        <div className="feature-chips">
          {required.map((feature) => <i key={feature}>{feature}</i>)}
        </div>
        <small>
          Target hindcast: {contract?.historical_replay?.target_event ?? '20 June 2022 El Faro–Altos de La Torre'}.
        </small>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading title="Historical calibration bridge">
        Raw rainfall preview. Dynamic stress calibration remains unvalidated.
      </SectionHeading>
      <div className="replay-status ready">
        <span>Raw data status</span>
        <b>{timeline.length.toLocaleString()} time steps · {formatTimestamp(range.start)} → {formatTimestamp(range.end)}</b>
      </div>
      <input
        type="range"
        min="0"
        max={timeline.length - 1}
        step="1"
        value={safeIndex}
        onChange={(event) => setIndex(Number(event.target.value))}
        aria-label="Rainfall timeline"
      />
      {current && (
        <div className="replay-metrics">
          <b>{formatTimestamp(current.timestamp)}</b>
          <span>Increment {formatMillimeters(current.rain_increment_mm)}</span>
          <span>24 h {formatMillimeters(current.r24h_mm)}</span>
          <span>3 d {formatMillimeters(current.r3d_mm)}</span>
          <span>15 d {formatMillimeters(current.r15d_mm)}</span>
        </div>
      )}
      <small>
        Raw rainfall is previewed separately until the dynamic stress calibration is validated.
      </small>
    </section>
  );
}
