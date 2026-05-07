export type ProjectStatus = 'active' | 'dormant' | 'completed';
export interface MatchRules {
    repos?: string[];
    tags?: string[];
}
export interface Project {
    id: string;
    name: string;
    status: ProjectStatus;
    match_rules: MatchRules;
    is_auto: boolean;
    first_event_at: number | null;
    last_event_at: number | null;
    created_at: number;
}
//# sourceMappingURL=project.d.ts.map