import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { api, queryKeys } from '@/lib/api';
import { formatTs } from '@/lib/utils';
export function Review() {
    const { t } = useTranslation();
    const [reflection, setReflection] = useState('');
    const qc = useQueryClient();
    const { data: review, isLoading } = useQuery({
        queryKey: queryKeys.reviewCurrent(),
        queryFn: api.reviews.current,
    });
    const complete = useMutation({
        mutationFn: () => api.reviews.complete(review.id, reflection),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() });
            setReflection('');
        },
    });
    if (isLoading)
        return _jsx("div", { className: "text-xs text-zinc-600", children: t('review.loading') });
    if (!review)
        return null;
    const isCompleted = !!review.completed_at;
    return (_jsxs("div", { className: "max-w-2xl mx-auto flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold tracking-tight", style: { color: '#e4e4e7' }, children: t('review.title') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('review.period', { start: formatTs(review.period_start), end: formatTs(review.period_end) }) })] }), isCompleted ? (_jsxs("div", { className: "rounded-xl p-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-2", style: { color: '#10b981' }, children: t('review.completed', { date: formatTs(review.completed_at) }) }), _jsx("p", { className: "text-xs leading-relaxed", style: { color: '#a1a1aa' }, children: review.reflection })] })) : (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("textarea", { className: "w-full rounded-lg p-3 text-sm resize-none", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 160 }, placeholder: t('review.placeholder'), value: reflection, onChange: e => setReflection(e.target.value) }), _jsx(Button, { disabled: reflection.trim().length < 20 || complete.isPending, onClick: () => complete.mutate(), children: complete.isPending ? t('review.saving') : t('review.submit') }), _jsx("p", { className: "text-xs", style: { color: '#3f3f46' }, children: t('review.minChars') })] }))] }));
}
