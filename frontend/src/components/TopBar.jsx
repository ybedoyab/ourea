import { BRAND } from '../config/brand.js';
import { OureaLogo } from './OureaLogo.jsx';

export function TopBar({
  scope,
  onScopeChange,
  view,
  onViewChange,
  userCost,
  aiCost,
  aiProfileLabel,
  onRunGuidedDemo,
  guidedDemoBusy,
}) {
  const robustLabel = aiProfileLabel
    ? `OUREA · ${aiProfileLabel}`
    : 'OUREA robust options';

  return (
    <header className="topbar">
      <div className="brand-group">
        <OureaLogo compact />
        <span className="sub">
          {scope === 'city' ? BRAND.descriptor : BRAND.slogan}
        </span>
      </div>

      <nav className="scope" aria-label="Product scale">
        <button
          type="button"
          data-testid="scope-city"
          className={scope === 'city' ? 'active' : ''}
          aria-pressed={scope === 'city'}
          onClick={() => onScopeChange('city')}
        >
          City screen
        </button>
        <button
          type="button"
          data-testid="scope-sandbox"
          className={scope === 'sandbox' ? 'active' : ''}
          aria-pressed={scope === 'sandbox'}
          onClick={() => onScopeChange('sandbox')}
        >
          Decision sandbox
        </button>
      </nav>

      <button
        type="button"
        className="guided-demo"
        data-testid="run-guided-demo"
        onClick={onRunGuidedDemo}
        disabled={guidedDemoBusy}
      >
        {guidedDemoBusy ? 'Running demo…' : 'Run guided demo'}
      </button>

      {scope === 'sandbox' && (
        <div className="seg" role="group" aria-label="Active portfolio comparison">
          <button
            type="button"
            data-testid="view-none"
            className={view === 'none' ? 'active' : ''}
            aria-pressed={view === 'none'}
            onClick={() => onViewChange('none')}
          >
            No action
          </button>
          <button
            type="button"
            data-testid="view-user"
            className={view === 'user' ? 'active' : ''}
            aria-pressed={view === 'user'}
            onClick={() => onViewChange('user')}
            disabled={!userCost}
          >
            Your plan · {userCost}
          </button>
          <button
            type="button"
            data-testid="view-ai"
            className={view === 'ai' ? 'active' : ''}
            aria-pressed={view === 'ai'}
            onClick={() => onViewChange('ai')}
            disabled={!aiCost}
          >
            {robustLabel} · {aiCost}
          </button>
        </div>
      )}
    </header>
  );
}
