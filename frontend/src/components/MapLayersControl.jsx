import { LAYER_LABELS } from '../config/uiCopy.js';

export function MapLayersControl({ open, layerState, onToggleOpen, onToggleLayer }) {
  return (
    <div className="map-layers">
      <button
        type="button"
        className="map-layers-toggle"
        data-testid="map-layers"
        aria-expanded={open}
        onClick={onToggleOpen}
      >
        Map layers
      </button>
      {open && (
        <div className="map-layers-pop" role="group" aria-label="Sandbox map layers">
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
      )}
    </div>
  );
}
