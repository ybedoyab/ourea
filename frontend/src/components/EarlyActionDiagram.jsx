import { EARLY_ACTION } from '../domain/earlyAction.js';

function House({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-7" y="-14" width="14" height="14" fill="#d8d0c4" stroke="#3d464a" strokeWidth="1.2" />
      <polygon points="-9,-14 0,-24 9,-14" fill="#8a6a44" stroke="#3d464a" strokeWidth="1.2" />
      <rect x="-2" y="-8" width="4" height="8" fill="#3d464a" />
    </g>
  );
}

function Slope({ treat = false }) {
  return (
    <>
      <path d="M8 78 L132 48 L132 118 L8 118 Z" fill={treat ? '#3d5348' : '#5a4a40'} />
      <House x={36} y={86} />
      <House x={70} y={78} />
      <House x={104} y={70} />
    </>
  );
}

function Frame({ children, title }) {
  return (
    <figure className="early-action-frame">
      <svg viewBox="0 0 140 128" role="img" aria-hidden="true">
        {children}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

export function EarlyActionDiagram() {
  return (
    <section className="early-action" data-testid="early-action-diagram">
      <b>{EARLY_ACTION.title}</b>
      <div className="early-action-grid">
        <Frame title={`1. ${EARLY_ACTION.frames[0].title}`}>
          <rect width="140" height="128" fill="#1c2428" />
          <circle cx="108" cy="22" r="14" fill="#8aa4b0" />
          <circle cx="96" cy="26" r="11" fill="#9bb3bc" />
          {[20, 40, 60, 80, 100, 28, 52, 76].map((x, index) => (
            <line
              key={`${x}-${index}`}
              x1={x}
              y1={18 + (index % 3) * 8}
              x2={x + 4}
              y2={32 + (index % 3) * 8}
              stroke="#c5d8e0"
              strokeWidth="1.4"
            />
          ))}
          <Slope />
        </Frame>
        <Frame title={`2. ${EARLY_ACTION.frames[1].title}`}>
          <rect width="140" height="128" fill="#1c2428" />
          <Slope />
          <path d="M24 52 L118 108" stroke="#7ea7c2" strokeWidth="3" fill="none" />
          <polygon points="118,108 104,102 110,94" fill="#7ea7c2" />
        </Frame>
        <Frame title={`3. ${EARLY_ACTION.frames[2].title}`}>
          <rect width="140" height="128" fill="#1c2428" />
          <Slope />
          <path d="M18 70 L60 92 L110 114" stroke="#c4a574" strokeWidth="2" fill="none" strokeDasharray="4 3" />
        </Frame>
        <Frame title={`4. ${EARLY_ACTION.frames[3].title}`}>
          <rect width="140" height="128" fill="#1c2428" />
          <Slope treat />
          <path d="M18 64 L122 100" stroke="#c8a75e" strokeWidth="3" fill="none" />
          <rect x="42" y="58" width="8" height="10" fill="#5d91a7" />
          <rect x="78" y="50" width="8" height="10" fill="#5d91a7" />
          <path d="M112 62 Q118 48 124 58" stroke="#8fbf9a" strokeWidth="2" fill="none" />
        </Frame>
      </div>
      <p>{EARLY_ACTION.legend}</p>
    </section>
  );
}
