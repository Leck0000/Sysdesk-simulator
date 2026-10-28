/**
 * ScoreDashboard — Live score bars (technical/process/communication),
 * evidence log, and real-time scoring feed display.
 *
 * Consumes: wsMiddleware (scoring_update real-time), ticketsSlice (selectedTicketId)
 * Produces: Visual score bars, evidence entries, connection status
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, color contrast, semantic HTML).
 * Responsive: >=1280px desktop-first; collapses to drawer <1024px.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { subscribeToScoringUpdates, selectTicketForScoring } from './slice';
import { selectFilteredQueue, selectSelectedTicket } from '../tickets/slice';
import { selectIsSubscribed, selectAggregateScores, selectLastUpdated, selectFeedback, selectCriterionScores, selectSelectedTicketId as scoringSelectSelectedTicketId } from './slice';

// ---------------------------------------------------------------------------
// Zod schemas for boundary validation
// ---------------------------------------------------------------------------

const CriterionScoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  score: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(0).max(100),
});

type CriterionScore = z.infer<typeof CriterionScoreSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Score bar individual bar */
interface ScoreBarProps {
  label: string;
  score: number; // 0-100
  maxScore: number; // 0-100
}

/** A single score bar with accessible labeling */
const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, maxScore }) => {
  const percentage = Math.max(0, Math.min(100, score));
  const ariaLabel = `${label} score: ${score} out of ${maxScore}`;

  return (
    <div>
      <h3 className="sr-only">{label} score</h3>
      <div>
        <div
          className="score-bar-bg"
          aria-hidden="true"
        >
          <div
            className="score-bar-fill"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          ></div>
        </div>
        <div className="score-value">
          {score}/{maxScore}
        </div>
      </div>
    </div>
  );
};

/** ScoreDashboard component */
export const ScoreDashboard: React.FC = () => {
  const dispatch = useDispatch();
  // Selectors from scoring slice
  const criterionScores = useSelector(selectCriterionScores);
  const { technical, process, communication } = useSelector(selectAggregateScores);
  const lastUpdated = useSelector(selectLastUpdated);
  const feedback = useSelector(selectFeedback);
  const isSubscribed = useSelector(selectIsSubscribed);
  const selectedTicketId = useSelector(scoringSelectSelectedTicketId);

  // Select tickets slice for selected ticket info
  const selectedTicket = useSelector(selectSelectedTicket);

  // Subscribe to scoring updates on mount
  useEffect(() => {
    dispatch(subscribeToScoringUpdates());
    if (selectedTicketId) {
      dispatch(selectTicketForScoring(selectedTicketId));
    }
  }, [dispatch, selectedTicketId]);

  // Render evidence log entries
  const renderEvidence = (): JSX.Element => {
    return (
      <div className="evidence-log">
        <h4>Evidence Log</h4>
        <p>No evidence entries yet. Add evidence via the scoring feed.</p>
      </div>
    );
  };

  return (
    <div className="score-dashboard">
      <header className="score-dashboard-header">
        <h2>Scoring Dashboard</h2>
        <div className="status-bar">
          <span>Subscription: {isSubscribed ? 'Connected' : 'Disconnected'}</span>
          <span>Last update: {lastUpdated ?? 'Never'}</span>
        </div>
      </header>

      <section className="score-bars">
        <ScoreBar label="Technical" score={technical} maxScore={100} />
        <ScoreBar label="Process" score={process} maxScore={100} />
        <ScoreBar label="Communication" score={communication} maxScore={100} />
      </section>

      <section className="evidence-log">
        <h3>Evidence Log</h3>
        {renderEvidence()}
        {feedback && (
          <div className="feedback-entry">
            <p>{feedback}</p>
          </div>
        )}
      </section>

      {selectedTicketId && selectedTicket && (
        <section className="ticket-context">
          <h3>Selected Ticket</h3>
          <p>Ticket ID: {selectedTicketId}</p>
          <p>Queue: {selectedTicket.queue ?? 'unknown'}</p>
        </section>
      )}
    </div>
  );
};
