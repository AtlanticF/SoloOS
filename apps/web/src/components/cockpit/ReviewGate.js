import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { api, queryKeys } from '@/lib/api';
export function ReviewGate({ review }) {
    const { t } = useTranslation();
    const [reflection, setReflection] = useState('');
    const qc = useQueryClient();
    const complete = useMutation({
        mutationFn: () => api.reviews.complete(review.id, reflection),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() }),
    });
    return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-2xl", style: { background: '#1c1a11', border: '1px solid #f59e0b33' }, children: "\uD83D\uDD12" }), _jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold tracking-tight mb-1", style: { color: '#e4e4e7' }, children: t('reviewGate.title') }), _jsx("p", { className: "text-xs", style: { color: '#71717a' }, children: t('reviewGate.subtitle') })] }), _jsx("textarea", { className: "w-full rounded-lg p-3 text-sm resize-none", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 120 }, placeholder: t('reviewGate.placeholder'), value: reflection, onChange: e => setReflection(e.target.value) }), _jsx(Button, { disabled: reflection.trim().length < 20 || complete.isPending, onClick: () => complete.mutate(), className: "w-full", children: complete.isPending ? t('reviewGate.saving') : t('reviewGate.submit') })] }));
}
