import { BRAND } from '../config/brand.js';
import { OureaLogo } from './OureaLogo.jsx';

export function TopBar({
  areaLabel,
  mode,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onHelp,
  onAbout,
  onStartOver,
  onToggleExplore,
  onLoadExample,
}) {
  return (
    <header className="topbar">
      <div className="brand-group">
        <OureaLogo compact />
        <span className="topbar-area">{areaLabel}</span>
      </div>
      <div className="topbar-actions" data-testid="persistent-nav">
        <button type="button" data-testid="help-button" onClick={onHelp}>Help</button>
        <div className="topbar-menu">
          <button
            type="button"
            data-testid="app-menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={onToggleMenu}
          >
            More
          </button>
          {menuOpen && (
            <div className="topbar-menu-list" role="menu">
              <button type="button" role="menuitem" data-testid="load-example" onClick={onLoadExample}>
                Load completed example
              </button>
              <button type="button" role="menuitem" data-testid="start-over" onClick={onStartOver}>
                Start over
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="toggle-explore"
                onClick={onToggleExplore}
              >
                {mode === 'explore' ? 'Return to guided decision' : 'Explore freely'}
              </button>
              <button type="button" role="menuitem" data-testid="about-ourea" onClick={onAbout}>
                About Ourea
              </button>
              <button type="button" role="menuitem" onClick={onCloseMenu}>Close menu</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { BRAND };
