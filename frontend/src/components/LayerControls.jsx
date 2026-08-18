import { LAYER_LABELS } from '../config/uiCopy.js';

export function LayerControls({ layerState, onToggleLayer }) {
  return (
    <section>
      <h2>Map layers</h2>
      <div className="toggles" role="group" aria-label="Sandbox map layers">
        {Object.entries(layerState).map(([key, enabled]) => (
          <button
            key={key}
            type="button"
            className={enabled ? 'on' : ''}
            aria-pressed={enabled}
            onClick={() => onToggleLayer(key)}
          >
            {LAYER_LABELS[key] ?? key}
          </button>
        ))}
      </div>
    </section>
  );
}
