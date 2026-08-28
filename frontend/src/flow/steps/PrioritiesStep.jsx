import { PRIORITY_CARDS } from '../../config/uiCopy.js';
import { ChoiceCard } from '../../components/ChoiceCard.jsx';
import { PriorityGlyph } from '../../components/FlowIcons.jsx';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

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
            <span className="choice-icon"><PriorityGlyph id={id} /></span>
            <b>{card.name}</b>
            <span>{card.description}</span>
          </ChoiceCard>
        ))}
      </div>
    </StepShell>
  );
}
