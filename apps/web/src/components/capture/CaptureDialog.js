import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, queryKeys } from '@/lib/api';
const OUTCOME_STYLES = {
    insight_created: { color: '#10b981', bg: '#10b98115' },
    stored_in_inbox_missing_vector: { color: '#f59e0b', bg: '#f59e0b15' },
    stored_in_inbox_missing_synthesis: { color: '#f59e0b', bg: '#f59e0b15' },
    stored_in_inbox_missing_fact: { color: '#f59e0b', bg: '#f59e0b15' },
    stored_pending: { color: '#71717a', bg: '#71717a15' },
};
export function CaptureDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [text, setText] = useState('');
    const [result, setResult] = useState(null);
    const { mutate, isPending } = useMutation({
        mutationFn: (content) => api.entries.capture(content),
        onSuccess: (data) => {
            setResult(data);
            queryClient.invalidateQueries({ queryKey: queryKeys.events() });
            queryClient.invalidateQueries({ queryKey: queryKeys.insights() });
            queryClient.invalidateQueries({ queryKey: queryKeys.entries() });
        },
    });
    function handleSubmit() {
        if (!text.trim())
            return;
        setResult(null);
        mutate(text.trim());
    }
    function handleClose() {
        onOpenChange(false);
        setTimeout(() => {
            setText('');
            setResult(null);
        }, 200);
    }
    const outcome = result?.capture?.outcome;
    const outcomeStyle = outcome ? OUTCOME_STYLES[outcome] : null;
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-xl", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "text-sm font-semibold flex items-center gap-2", style: { color: '#e4e4e7' }, children: [_jsx("span", { className: "w-5 h-5 rounded flex items-center justify-center flex-shrink-0", style: { background: '#10b98120', color: '#10b981' }, children: _jsx(Zap, { size: 11 }) }), t('capture.title')] }) }), !result ? (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("p", { className: "text-xs", style: { color: '#52525b' }, children: t('capture.hint') }), _jsx("textarea", { autoFocus: true, value: text, onChange: e => setText(e.target.value), onKeyDown: e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                                    handleSubmit();
                            }, rows: 4, placeholder: t('capture.placeholder'), className: "w-full rounded-lg px-3 py-2 text-sm resize-none", style: {
                                background: '#18181b',
                                border: '1px solid #27272a',
                                color: '#e4e4e7',
                                outline: 'none',
                                lineHeight: '1.6',
                            } }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs", style: { color: '#3f3f46' }, children: t('capture.submitHint') }), _jsx(Button, { onClick: handleSubmit, disabled: !text.trim() || isPending, className: "flex-shrink-0", style: { background: '#10b981', color: '#fff' }, children: isPending ? t('capture.parsing') : t('capture.submit') })] })] })) : (_jsxs("div", { className: "flex flex-col gap-3", children: [outcomeStyle && outcome && (_jsx("div", { className: "rounded-lg px-3 py-2.5 text-xs", style: { background: outcomeStyle.bg, color: outcomeStyle.color, border: `1px solid ${outcomeStyle.color}30` }, children: result.capture?.feedback })), result.capture?.insight && (_jsxs("div", { className: "flex flex-col gap-2 rounded-lg p-3", style: { background: '#18181b', border: '1px solid #27272a' }, children: [_jsx(InsightField, { label: t('capture.fact'), value: result.capture.insight.content.fact }), _jsx(InsightField, { label: t('capture.synthesis'), value: result.capture.insight.content.synthesis }), _jsx(InsightField, { label: t('capture.vector'), value: result.capture.insight.content.vector }), _jsxs("div", { className: "grid grid-cols-2 gap-2 mt-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: '#3f3f46' }, children: t('nodeSheet.type') }), _jsx("span", { className: "text-xs px-2 py-0.5 rounded font-mono", style: { background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }, children: t(`nodeSheet.insightType.${result.capture.insight.type}`) })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: '#3f3f46' }, children: t('nodeSheet.status') }), _jsx("span", { className: "text-xs px-2 py-0.5 rounded font-mono", style: { background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }, children: t(`nodeSheet.insightStatus.${result.capture.insight.status}`) })] })] })] })), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => { setText(''); setResult(null); }, className: "hover:text-zinc-300", style: { background: '#141416', borderColor: '#232329', color: '#7c7c86' }, children: t('capture.captureAnother') }), _jsx(Button, { onClick: handleClose, className: "hover:text-white", style: { background: '#202024', color: '#f4f4f5', border: '1px solid #3a3a42' }, children: t('capture.done') })] })] }))] }) }));
}
function InsightField({ label, value }) {
    if (!value)
        return null;
    return (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest", style: { color: '#3f3f46' }, children: label }), _jsx("span", { className: "text-xs", style: { color: '#a1a1aa' }, children: value })] }));
}
