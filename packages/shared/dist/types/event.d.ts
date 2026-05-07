import type { Pillar } from './pillar';
export type Classifier = 'rule' | 'api-key' | 'skill' | 'human';
export interface Event {
    id: string;
    entry_id: string;
    pillar: Pillar;
    project_id: string | null;
    impact_score: number;
    classifier: Classifier;
    metadata: Record<string, unknown>;
    occurred_at: number;
    created_at: number;
}
export interface CreateEventInput {
    entry_id: string;
    pillar: Pillar;
    project_id?: string;
    impact_score?: number;
    classifier: Classifier;
    metadata?: Record<string, unknown>;
    occurred_at?: number;
}
export interface EventLink {
    source_event_id: string;
    target_event_id: string;
    link_type: 'caused' | 'related' | 'derived';
    confidence: number;
    created_by: 'rule' | 'ai' | 'human';
}
//# sourceMappingURL=event.d.ts.map