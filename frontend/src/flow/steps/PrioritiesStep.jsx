import { PRIORITY_CARDS } from '../../config/uiCopy.js';
import { ChoiceCard } from '../../components/ChoiceCard.jsx';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

function PriorityIcon({ id }) {
  if (id === 'equity') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18V10h3v8H6zm5 0V6h3v12h-3zm5 0v-5h3v5h-3z" fill="currentColor" />
      </svg>
    );
  }
  if (id === 'access') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17l5-9 3 5 3-4 3 8H5z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (id === 'low_regret') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l7 4v8l-7 4-7-4V8l7-4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function PrioritiesStep({
  state,
  onSelect,
  onHow,
  onBack,
  onContinue,
}) {
  const selected = PRIORITY_CARDS[state.profileId] ?? PRIORITY_CARDS.balanced;

  return (
    <StepShell
      state={state}
      actions={(
        <FlowActions
          onBack={onBack}
          onContinue={onContinue}
          continueLabel={`Continue with ${selected.name}`}
          continueTestId="confirm-priority"
        />
      )}
    >
      <div className="priority-grid" role="radiogroup" aria-label="Portfolio priority">
        {Object.entries(PRIORITY_CARDS).map(([id, card]) => (
          <ChoiceCard
            key={id}
            selected={state.profileId === id}
            testId={`priority-${id}`}
            onClick={() => onSelect(id)}
            footer={(
              <button
                type="button"
                className="choice-how"
                data-testid={`priority-how-${id}`}
                onClick={() => onHow(id)}
              >
                How this changes the decision
              </button>
            )}
          >
            <span className="choice-icon"><PriorityIcon id={id} /></span>
            <b>{card.name}</b>
            <span>{card.description}</span>
          </ChoiceCard>
        ))}
      </div>
    </StepShell>
  );
}
