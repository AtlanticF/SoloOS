import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function pillarBadgeClass(pillar) {
    return `pillar-badge-${pillar.toLowerCase()}`;
}
export function formatTs(unix, locale) {
    return new Date(unix * 1000).toLocaleString(locale, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}
export function formatMoney(dollars) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars);
}
