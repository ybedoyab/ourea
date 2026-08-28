import { useId, useState } from 'react';
import { AI_REVIEW_COPY, READINESS_LABELS } from '../config/aiReview.js';

function Skeleton() {
  return (
    <div className="ai-review-skeleton" data-testid="ai-review-loading" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function List({ title, items, testId }) {
  if (!items?.length) return null;
  return (
    <section data-testid={testId}>
      <b>{title}</b>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export function AiDecisionReviewCard({ readiness, review }) {
  const regionId = useId();
  const [open, setOpen] = useState(true);
  const badge = READINESS_LABELS[readiness?.status] ?? READINESS_LABELS.needs_evidence_review;
  const pendingGates = (readiness?.gates ?? []).filter((gate) => gate.status !== 'passed');

  return (
    <article className="ai-review-card" data-testid="ai-decision-review">
      <header>
        <b>{AI_REVIEW_COPY.title}</b>
        <p>{AI_REVIEW_COPY.purpose}</p>
        <small>{AI_REVIEW_COPY.interprets}</small>
      </header>

      {review.status === 'unconfigured' && (
        <p className="hint" role="status" data-testid="ai-review-unconfigured">{AI_REVIEW_COPY.unconfigured}</p>
      )}

      {review.status === 'idle' && (
        <button type="button" className="primary" data-testid="generate-decision-review" onClick={() => review.generate()}>
          {AI_REVIEW_COPY.generate}
        </button>
      )}

      {review.status === 'loading' && (
        <div>
          <p className="hint" role="status">{AI_REVIEW_COPY.generating}</p>
          <Skeleton />
          <button type="button" className="flow-tertiary" data-testid="cancel-decision-review" onClick={review.cancel}>
            {AI_REVIEW_COPY.cancel}
          </button>
        </div>
      )}

      {review.status === 'error' && (
        <div>
          <p className="flow-banner warning" role="alert" data-testid="ai-review-error">{review.error?.message}</p>
          <button type="button" className="primary" data-testid="generate-decision-review" onClick={() => review.generate()}>
            {AI_REVIEW_COPY.generate}
          </button>
        </div>
      )}

      {review.status === 'success' && review.synthesis && (
        <div>
          <div className="ai-review-toolbar">
            <span className={`ai-review-badge is-${readiness?.status}`} data-testid="ai-review-badge">{badge}</span>
            <button
              type="button"
              className="flow-tertiary"
              data-testid="toggle-decision-review"
              aria-expanded={open}
              aria-controls={regionId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? AI_REVIEW_COPY.collapse : AI_REVIEW_COPY.expand}
            </button>
          </div>
          <div id={regionId} hidden={!open} data-testid="ai-review-result">
            <p className="takeaway" data-testid="ai-review-headline">{review.synthesis.headline}</p>
            <List title={AI_REVIEW_COPY.why} items={review.synthesis.portfolio_rationale} testId="ai-review-why" />
            <section data-testid="ai-review-gates">
              <b>{AI_REVIEW_COPY.gates}</b>
              <ul>
                {pendingGates.map((gate) => (
                  <li key={gate.id}>
                    <strong>{gate.label}</strong>
                    {' — '}
                    {review.synthesis.gate_explanations.find((item) => item.gate_id === gate.id)?.explanation
                      ?? gate.reason}
                  </li>
                ))}
              </ul>
            </section>
            <List title={AI_REVIEW_COPY.questions} items={review.synthesis.field_visit_questions} testId="ai-review-questions" />
            <section data-testid="ai-review-next">
              <b>{AI_REVIEW_COPY.next}</b>
              <ol>
                {review.synthesis.next_actions.map((item) => (
                  <li key={item.order}>
                    {item.action}
                    {' '}
                    <small>{item.owner} · {item.timing}</small>
                  </li>
                ))}
              </ol>
            </section>
            <List title={AI_REVIEW_COPY.cannot} items={review.synthesis.cannot_conclude} testId="ai-review-cannot" />
            <p className="hint">
              <time dateTime={review.generatedAt}>{review.generatedAt}</time>
              {' · '}
              {AI_REVIEW_COPY.assisted}
            </p>
          </div>
          <button type="button" className="flow-tertiary" data-testid="regenerate-decision-review" onClick={review.regenerate}>
            {AI_REVIEW_COPY.regenerate}
          </button>
        </div>
      )}
    </article>
  );
}

export function AiDecisionReviewSummary({ readiness, review }) {
  if (review?.status !== 'success' || !readiness) return null;
  const badge = READINESS_LABELS[readiness.status];
  const pending = (readiness.gates ?? []).filter((gate) => gate.status !== 'passed');
  return (
    <article className="ai-review-summary" data-testid="ai-review-summary">
      <span className={`ai-review-badge is-${readiness.status}`}>{badge}</span>
      <p>{review.synthesis?.headline}</p>
      {pending.length > 0 && (
        <ul>
          {pending.map((gate) => (
            <li key={gate.id}>{gate.label}: {gate.status}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
