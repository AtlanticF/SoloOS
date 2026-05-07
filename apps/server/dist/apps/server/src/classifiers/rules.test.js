import { describe, it, expect } from 'vitest';
import { applyRules } from './rules';
describe('applyRules', () => {
    it('returns OUTPUT for github source', () => {
        const entry = {
            content: '{}',
            source: 'github',
        };
        expect(applyRules(entry)).toBe('OUTPUT');
    });
    it('returns FINANCIAL for stripe source', () => {
        expect(applyRules({ content: '{}', source: 'stripe' })).toBe('FINANCIAL');
    });
    it('returns the pillar tag if content has #input tag', () => {
        expect(applyRules({ content: 'read an article #input', source: 'cli' })).toBe('INPUT');
    });
    it('returns null for unmatched cli input', () => {
        expect(applyRules({ content: 'random thought', source: 'cli' })).toBeNull();
    });
});
