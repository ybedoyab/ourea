import { BRAND } from '../config/brand.js';
import { CITY_LENSES } from '../config/uiCopy.js';

export function MapLegend({ scope, cityLens = 'balanced', collapsed, onToggle }) {
  const lens = CITY_LENSES[cityLens] ?? CITY_LENSES.balanced;
  const title = scope === 'city'
    ? `${lens.label} lens · city priority proxy`
    : 'Climate Stress · planning index';

  return (
    <div className={collapsed ? 'map-legend is-collapsed' : 'map-legend'}>
      <div className="map-legend-head">
        <b>{collapsed ? 'Legend' : title}</b>
        <button
          type="button"
          className="map-legend-toggle"
          data-testid="legend-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show legend' : 'Hide legend'}
          onClick={onToggle}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      {!collapsed && (scope === 'city' ? (
        <>
          <span><i className="legend-swatch unmatched" /> unmatched / special polygon</span>
          <span><i className="legend-swatch low" /> lower priority proxy</span>
          <span><i className="legend-swatch medium" /> medium</span>
          <span><i className="legend-swatch high" /> higher</span>
          <span className="legend-note">Comuna names at city zoom · barrio names when you zoom in</span>
        </>
      ) : (
        <>
          <span><i className="legend-swatch stress-low" /> lower</span>
          <span><i className="legend-swatch stress-med" /> medium</span>
          <span><i className="legend-swatch stress-high" /> higher</span>
          <span className="legend-divider" />
          <span><i className="legend-dot rwh" /> Rainwater harvesting</span>
          <span><i className="legend-dot drainage" /> Drainage</span>
          <span><i className="legend-dot restoration" /> Restoration</span>
          <span className="legend-note">Drag to pan · right-drag or Ctrl+drag to orbit · scroll to zoom</span>
          <span className="legend-note">Hover a building to identify its planning cell</span>
          <span className="legend-note">{BRAND.provingGround}</span>
        </>
      ))}
    </div>
  );
}
