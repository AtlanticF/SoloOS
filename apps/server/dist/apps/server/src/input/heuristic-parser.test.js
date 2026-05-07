import { describe, it, expect } from 'vitest';
import { heuristicParse, deriveInsightType, deriveOutcome, buildFeedback } from './heuristic-parser';
describe('heuristicParse', () => {
    it('detects fact from URL', () => {
        const r = heuristicParse('https://example.com/article — key point is X, plan to apply it');
        expect(r.fact).toContain('example.com');
    });
    it('detects synthesis from "意识到"', () => {
        const r = heuristicParse('看了 Dan Koe，意识到流程比工具重要，打算简化录入');
        expect(r.synthesis).toBeTruthy();
    });
    it('detects vector from "打算"', () => {
        const r = heuristicParse('看了 Dan Koe，意识到流程比工具重要，打算简化录入');
        expect(r.vector).toBeTruthy();
    });
    it('reports missing fields correctly', () => {
        const r = heuristicParse('just a raw fact with no insight or plan');
        expect(r.missing).toContain('synthesis');
        expect(r.missing).toContain('vector');
    });
    it('certainty is 1 when all three present', () => {
        const r = heuristicParse('from https://example.com realized key thing plan to do it');
        expect(r.certainty).toBeGreaterThan(0);
    });
    it('certainty is 0 when all three missing', () => {
        const r = heuristicParse('random text with nothing');
        expect(r.certainty).toBe(0);
        expect(r.missing).toHaveLength(3);
    });
});
describe('deriveInsightType', () => {
    it('returns STRATEGY for business content', () => {
        const t = deriveInsightType({ fact: 'one person company', synthesis: 'strategic model', vector: 'restructure' }, 'solo business framework');
        expect(t).toBe('STRATEGY');
    });
    it('returns TECHNIQUE for tech content', () => {
        const t = deriveInsightType({ fact: '', synthesis: 'Go interface pattern', vector: '' }, 'code architecture pattern');
        expect(t).toBe('TECHNIQUE');
    });
    it('returns MARKET for user/market content', () => {
        const t = deriveInsightType({ fact: '', synthesis: 'user pain point', vector: '' }, 'market demand analysis');
        expect(t).toBe('MARKET');
    });
    it('defaults to SEED', () => {
        const t = deriveInsightType({ fact: '', synthesis: '', vector: '' }, 'random thought');
        expect(t).toBe('SEED');
    });
});
describe('deriveOutcome', () => {
    it('returns insight_created when all present', () => {
        expect(deriveOutcome([], 1)).toBe('insight_created');
    });
    it('returns missing_vector when vector absent', () => {
        expect(deriveOutcome(['vector'], 2 / 3)).toBe('stored_in_inbox_missing_vector');
    });
    it('returns missing_synthesis when synthesis absent', () => {
        expect(deriveOutcome(['synthesis'], 2 / 3)).toBe('stored_in_inbox_missing_synthesis');
    });
    it('returns missing_fact when fact absent', () => {
        expect(deriveOutcome(['fact'], 2 / 3)).toBe('stored_in_inbox_missing_fact');
    });
});
describe('buildFeedback', () => {
    it('returns a non-empty string for every outcome', () => {
        const outcomes = [
            'insight_created',
            'stored_in_inbox_missing_vector',
            'stored_in_inbox_missing_synthesis',
            'stored_in_inbox_missing_fact',
            'stored_pending',
        ];
        for (const o of outcomes) {
            expect(buildFeedback(o).length).toBeGreaterThan(0);
        }
    });
});
