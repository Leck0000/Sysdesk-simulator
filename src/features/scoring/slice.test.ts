/** Slice tests for scores feature */
import { describe, it, expect } from 'vitest';
import scoresReducer from './slice';

describe('scoresSlice', () => {
  let initialState: ReturnType<typeof scoresReducer>;

  beforeEach(() => {
    initialState = scoresReducer(undefined, { type: '@@INIT' });
  });

  it('has an initial state', () => {
    expect(initialState.criterionScores).toEqual({});
    expect(initialState.technical).toBe(0);
    expect(initialState.process).toBe(0);
    expect(initialState.communication).toBe(0);
    expect(initialState.lastUpdated).toBeNull();
    expect(initialState.feedback).toBeNull();
    expect(initialState.isSubscribed).toBe(false);
  });

  describe('setCriterionScores', () => {
    it('sets per-criterion scores and recalculates aggregates', () => {
      const scores = {
        c1: 80,
        c2: 90,
        c3: 70,
      };

      const state = scoresReducer(initialState, {
        type: 'scores/setCriterionScores',
        payload: scores,
      });

      expect(state.criterionScores.c1?.score).toBe(80);
      expect(state.criterionScores.c2?.score).toBe(90);
      expect(state.criterionScores.c3?.score).toBe(70);
      // All three aggregates should be the average
      expect(state.technical).toBe(80); // (80+90+70)/3 = 80
      expect(state.process).toBe(80);
      expect(state.communication).toBe(80);
    });

    it('handles empty updates gracefully', () => {
      const state = scoresReducer(initialState, {
        type: 'scores/setCriterionScores',
        payload: {},
      });

      expect(state.criterionScores).toEqual({});
      expect(state.technical).toBe(0);
      expect(state.process).toBe(0);
      expect(state.communication).toBe(0);
    });
  });

  describe('mergeScoringUpdate', () => {
    it('merges a scoring update into the state', () => {
      const state = scoresReducer(initialState, {
        type: 'scores/mergeScoringUpdate',
        payload: {
          ticketId: 'tick-1',
          score: 75,
          feedback: 'Good work',
          timestamp: new Date().toISOString(),
        },
      });

      expect(state.technical).toBe(75);
      expect(state.process).toBe(75);
      expect(state.communication).toBe(75);
      expect(state.feedback).toBe('Good work');
      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe('setSubscribed', () => {
    it('sets subscription status', () => {
      const state = scoresReducer(initialState, {
        type: 'scores/setSubscribed',
        payload: true,
      });

      expect(state.isSubscribed).toBe(true);
    });
  });

  describe('selectTicket', () => {
    it('resets scores when null is passed', () => {
      const state1 = scoresReducer(initialState, {
        type: 'scores/setCriterionScores',
        payload: { c1: 50, c2: 60 },
      });

      const state2 = scoresReducer(state1, {
        type: 'scores/selectTicket',
        payload: null,
      });

      expect(state2.criterionScores).toEqual({});
      expect(state2.technical).toBe(0);
      expect(state2.process).toBe(0);
      expect(state2.communication).toBe(0);
    });

    it('keeps scores when ticket ID is provided', () => {
      const state1 = scoresReducer(initialState, {
        type: 'scores/setCriterionScores',
        payload: { c1: 50, c2: 60 },
      });

      const state2 = scoresReducer(state1, {
        type: 'scores/selectTicket',
        payload: 'some-ticket-id',
      });

      // Scores should be preserved (rubric loading is TODO)
      expect(state2.criterionScores.c1?.score).toBe(50);
      expect(state2.criterionScores.c2?.score).toBe(60);
    });
  });
});
