const TAG_MAP = {
    '#input': 'INPUT',
    '#output': 'OUTPUT',
    '#audience': 'AUDIENCE',
    '#financial': 'FINANCIAL',
    '#energy': 'ENERGY',
};
export function applyRules(entry) {
    if (entry.source === 'github')
        return 'OUTPUT';
    if (entry.source === 'stripe')
        return 'FINANCIAL';
    const lower = entry.content.toLowerCase();
    for (const [tag, pillar] of Object.entries(TAG_MAP)) {
        if (lower.includes(tag))
            return pillar;
    }
    return null;
}
