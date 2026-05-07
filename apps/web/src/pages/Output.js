import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitBranch, GitCommitHorizontal } from 'lucide-react';
import { api, queryKeys } from '@/lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OutputHeader } from '@/components/output/OutputHeader';
import { OutputLifecycleSummary } from '@/components/output/OutputLifecycleSummary';
import { OutputTimelineTable } from '@/components/output/OutputTimelineTable';
import { RepoProjectBindingDialog } from '@/components/output/RepoProjectBindingDialog';
import { GithubOnboardingCard } from '@/components/output/GithubOnboardingCard';
import { AssociationPanel } from '@/components/output/AssociationPanel';
const PAGE_LIMIT = 50;
const SUMMARY_LIMIT = 100;
export function Output() {
    const { t } = useTranslation();
    const [activeState, setActiveState] = useState(null);
    const [selectedRepoId, setSelectedRepoId] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [cursor, setCursor] = useState(undefined);
    const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
    const [repoPickerOpen, setRepoPickerOpen] = useState(false);
    const [selectedRepoForBinding, setSelectedRepoForBinding] = useState(null);
    const [editingBinding, setEditingBinding] = useState(null);
    const [selectedRepoCardId, setSelectedRepoCardId] = useState(null);
    const [selectedOutputEvent, setSelectedOutputEvent] = useState(null);
    const { data: summary } = useQuery({
        queryKey: queryKeys.outputSummary(),
        queryFn: api.output.summary,
        refetchInterval: 30000,
    });
    const { data: bindings = [] } = useQuery({
        queryKey: queryKeys.outputBindings(),
        queryFn: api.output.listBindings,
    });
    const { data: projects = [] } = useQuery({
        queryKey: queryKeys.projects(),
        queryFn: api.projects.list,
    });
    const { data: githubConfig } = useQuery({
        queryKey: queryKeys.githubConfig(),
        queryFn: api.githubConfig.get,
    });
    const activeBinding = selectedRepoId
        ? bindings.find((b) => b.repo_id === selectedRepoId) ?? null
        : null;
    const effectiveProjectId = selectedProjectId ?? activeBinding?.project_id ?? null;
    const { data: eventsPage, isLoading } = useQuery({
        queryKey: queryKeys.outputEvents({ cursor, state: activeState, repoId: selectedRepoId, projectId: effectiveProjectId }),
        queryFn: () => api.output.events({
            cursor,
            limit: PAGE_LIMIT,
            state: activeState ?? undefined,
            repoId: selectedRepoId ?? undefined,
            projectId: effectiveProjectId ?? undefined,
        }),
    });
    const { data: scopedSummaryEventsPage } = useQuery({
        queryKey: queryKeys.outputEvents({ cursor: undefined, state: null, repoId: selectedRepoId, projectId: effectiveProjectId, limit: SUMMARY_LIMIT }),
        queryFn: () => api.output.events({
            limit: SUMMARY_LIMIT,
            repoId: selectedRepoId ?? undefined,
            projectId: effectiveProjectId ?? undefined,
        }),
        enabled: selectedRepoCardId !== null,
    });
    const { data: cardEventsPage } = useQuery({
        queryKey: queryKeys.outputEvents({ cursor: undefined, state: null, repoId: undefined, projectId: undefined, limit: 100 }),
        queryFn: () => api.output.events({ limit: 100 }),
        enabled: !!githubConfig,
    });
    const { data: selectedEventDetail } = useQuery({
        queryKey: queryKeys.events({ id: selectedOutputEvent?.event_id }),
        queryFn: () => api.events.get(selectedOutputEvent.event_id),
        enabled: !!selectedOutputEvent?.event_id,
    });
    function handleLoadMore() {
        if (eventsPage?.next_cursor) {
            setCursor(eventsPage.next_cursor);
        }
    }
    function handleStateClick(state) {
        setActiveState(state);
        setCursor(undefined);
    }
    const hasNoBindings = bindings.length === 0;
    const items = eventsPage?.items ?? [];
    const hasNextPage = !!eventsPage?.next_cursor;
    const inDetailView = selectedRepoCardId !== null;
    const latestEventByRepo = useMemo(() => {
        const map = new Map();
        for (const evt of cardEventsPage?.items ?? []) {
            if (!map.has(evt.repo_id))
                map.set(evt.repo_id, evt);
        }
        return map;
    }, [cardEventsPage?.items, items]);
    const defaultSummary = summary ?? {
        counts: { DRAFT: 0, ACTIVE: 0, VALUATED: 0, GHOST: 0, ARCHIVED: 0 },
        totals: { allocated_cost: '0.00', realized_revenue: '0.00' },
        sync_status: 'idle',
        last_synced_at: null,
    };
    const scopedCounts = useMemo(() => {
        const counts = {
            DRAFT: 0,
            ACTIVE: 0,
            VALUATED: 0,
            GHOST: 0,
            ARCHIVED: 0,
        };
        for (const evt of scopedSummaryEventsPage?.items ?? []) {
            counts[evt.state] += 1;
        }
        return counts;
    }, [scopedSummaryEventsPage?.items]);
    const lifecycleSummary = inDetailView
        ? { ...defaultSummary, counts: scopedCounts }
        : defaultSummary;
    return (_jsxs("div", { className: "flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 rounded-lg", style: { background: '#14532d20' }, children: _jsx(GitCommitHorizontal, { size: 16, style: { color: '#4ade80' } }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: t('output.title') }), _jsx("p", { className: "text-xs", style: { color: '#52525b' }, children: t('output.subtitle') })] }), _jsxs("div", { className: "ml-auto flex items-center gap-4", children: [_jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs", style: { color: '#52525b' }, children: t('output.cost') }), _jsxs("p", { className: "text-sm font-mono tabular-nums", style: { color: '#e4e4e7' }, children: ["$", defaultSummary.totals.allocated_cost] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs", style: { color: '#52525b' }, children: t('output.revenue') }), _jsxs("p", { className: "text-sm font-mono tabular-nums", style: { color: '#fbbf24' }, children: ["$", defaultSummary.totals.realized_revenue] })] })] })] }), !githubConfig || hasNoBindings ? (_jsx("div", { className: "flex flex-col gap-4", children: _jsx(GithubOnboardingCard, { importedRepoIds: bindings.map(b => b.repo_id), onBindRepo: (repo) => {
                        setSelectedRepoForBinding(repo);
                        setBindingDialogOpen(true);
                    } }) })) : !inDetailView ? (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: t('output.projectsTitle') }), _jsx("button", { onClick: () => setRepoPickerOpen(true), className: "text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-zinc-600", style: { background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }, children: t('output.manageRepos') })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: bindings.map((binding) => {
                            const linkedProject = projects.find((p) => p.id === binding.project_id);
                            const latest = latestEventByRepo.get(binding.repo_id);
                            return (_jsxs("button", { onClick: () => {
                                    setSelectedRepoCardId(binding.repo_id);
                                    setSelectedRepoId(binding.repo_id);
                                    setSelectedProjectId(binding.project_id ?? null);
                                    setActiveState('ACTIVE');
                                    setSelectedOutputEvent(null);
                                    setCursor(undefined);
                                }, className: "text-left rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.35),0_0_24px_rgba(74,222,128,0.14)]", style: { background: '#0d0d0d', borderColor: '#27272a' }, children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-base font-semibold truncate", style: { color: '#e4e4e7' }, children: linkedProject?.name ?? binding.repo_name }), _jsxs("div", { className: "text-sm truncate underline flex items-center gap-1.5", style: { color: '#71717a' }, children: [_jsx(GitBranch, { size: 13, className: "flex-shrink-0" }), _jsx("span", { className: "truncate", children: binding.repo_full_name })] }), _jsxs("div", { className: "text-xs mt-1", style: { color: '#a1a1aa' }, children: [t('output.boundProject'), ": ", linkedProject?.name ?? t('output.unboundProject')] })] }), _jsx("span", { className: "text-[11px] px-2 py-1 rounded-full border", style: {
                                                    color: binding.project_id ? '#22c55e' : '#a1a1aa',
                                                    borderColor: binding.project_id ? '#22c55e55' : '#3f3f46',
                                                    background: binding.project_id ? '#14532d22' : 'transparent',
                                                }, children: binding.project_id ? t('output.linked') : t('output.unlinked') })] }), !binding.project_id && (_jsx("div", { children: _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                setEditingBinding(binding);
                                                setBindingDialogOpen(true);
                                            }, className: "text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:border-zinc-500", style: { background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }, children: t('output.linkProjectQuick') }) })), latest ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-sm line-clamp-1", style: { color: '#e4e4e7' }, children: latest.commit_message }), _jsxs("div", { className: "text-xs", style: { color: '#71717a' }, children: [new Date(latest.committed_at * 1000).toLocaleDateString(), " \u00B7 ", latest.author] })] })) : (_jsx("div", { className: "text-xs", style: { color: '#52525b' }, children: t('output.noCommits') }))] }, binding.id));
                        }) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs("button", { onClick: () => {
                                setSelectedRepoCardId(null);
                                setSelectedRepoId(null);
                                setSelectedProjectId(null);
                                setSelectedOutputEvent(null);
                                setCursor(undefined);
                            }, className: "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:border-blue-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60", style: { background: '#1e3a8a33', borderColor: '#3b82f6aa', color: '#bfdbfe' }, children: [_jsx(ArrowLeft, { size: 12 }), t('output.backToProjects')] }) }), _jsx(OutputHeader, { bindings: bindings, projects: projects, selectedRepoId: selectedRepoId, selectedProjectId: selectedProjectId }), _jsx(OutputLifecycleSummary, { summary: lifecycleSummary, activeState: activeState, onStateClick: handleStateClick }), _jsx(OutputTimelineTable, { items: items, isLoading: isLoading, hasNextPage: hasNextPage, onLoadMore: handleLoadMore, selectedItemId: selectedOutputEvent?.id ?? null, onItemClick: setSelectedOutputEvent })] })), _jsx(RepoProjectBindingDialog, { open: bindingDialogOpen, onOpenChange: (open) => {
                    setBindingDialogOpen(open);
                    if (!open) {
                        setSelectedRepoForBinding(null);
                        setEditingBinding(null);
                    }
                }, projects: projects, existingBinding: editingBinding, presetRepo: editingBinding ? null : selectedRepoForBinding }), repoPickerOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", style: { background: 'rgba(0,0,0,0.7)' }, onClick: () => setRepoPickerOpen(false), children: _jsxs("div", { className: "w-full max-w-4xl max-h-[85vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [_jsx(GithubOnboardingCard, { mode: "manage", importedRepoIds: bindings.map(b => b.repo_id), onBindRepo: (repo) => {
                                setSelectedRepoForBinding(repo);
                                setRepoPickerOpen(false);
                                setBindingDialogOpen(true);
                            } }), _jsx("div", { className: "mt-3 flex justify-end", children: _jsx("button", { onClick: () => setRepoPickerOpen(false), className: "text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-zinc-600", style: { background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }, children: t('output.bindingDialog.cancel') }) })] }) })), _jsx(OutputEventDetailSheet, { item: selectedOutputEvent, eventDetail: selectedEventDetail ?? null, onClose: () => setSelectedOutputEvent(null), projectId: effectiveProjectId })] }));
}
function OutputEventDetailSheet({ item, eventDetail, onClose, projectId, }) {
    const { t } = useTranslation();
    return (_jsx(Sheet, { open: !!item, onOpenChange: (open) => !open && onClose(), children: _jsx(SheetContent, { side: "right", className: "w-[420px] sm:max-w-[420px] overflow-y-auto", style: { background: '#0d0d0d', borderLeft: '1px solid #1e1e22' }, children: item ? (_jsxs("div", { className: "flex flex-col gap-3 text-xs", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { className: "text-sm", style: { color: '#e4e4e7' }, children: t('output.detailTitle') }) }), _jsx(DetailRow, { label: t('output.detailCommit'), value: item.commit_sha, mono: true }), _jsx(DetailRow, { label: t('output.detailRepo'), value: item.repo_name }), _jsx(DetailRow, { label: t('output.detailAuthor'), value: item.author }), _jsx(DetailRow, { label: t('output.detailMessage'), value: item.commit_message }), _jsx(DetailRow, { label: t('output.detailCommittedAt'), value: new Date(item.committed_at * 1000).toLocaleString() }), _jsx(DetailRow, { label: t('output.detailDiff'), value: `+${item.additions} / -${item.deletions} / ${item.files_changed} files`, mono: true }), _jsx(DetailRow, { label: t('output.cost'), value: `$${item.allocated_cost}`, mono: true }), parseFloat(item.realized_revenue) > 0 && (_jsx(DetailRow, { label: t('output.revenue'), value: `$${item.realized_revenue}`, mono: true })), _jsx("div", { className: "h-px", style: { background: '#1e1e22' } }), _jsx("div", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: t('output.detailEventTitle') }), _jsx(DetailRow, { label: t('output.detailEventId'), value: item.event_id, mono: true }), eventDetail ? (_jsxs(_Fragment, { children: [_jsx(DetailRow, { label: t('output.detailPillar'), value: eventDetail.pillar }), _jsx(DetailRow, { label: t('output.detailClassifier'), value: eventDetail.classifier }), _jsx(DetailRow, { label: t('output.detailImpact'), value: String(eventDetail.impact_score) }), _jsx(DetailRow, { label: t('output.detailOccurredAt'), value: new Date(eventDetail.occurred_at * 1000).toLocaleString() }), _jsx(DetailRow, { label: t('output.detailMetadata'), value: JSON.stringify(eventDetail.metadata, null, 2), mono: true, multiline: true })] })) : (_jsx("div", { style: { color: '#71717a' }, children: t('output.detailEventLoading') })), _jsx("div", { className: "h-px mt-1", style: { background: '#1e1e22' } }), _jsx(AssociationPanel, { outputMetadataId: item.id, projectId: projectId })] })) : (_jsx("div", { className: "text-sm", style: { color: '#71717a' }, children: t('output.selectCommitHint') })) }) }));
}
function DetailRow({ label, value, mono = false, multiline = false, }) {
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { style: { color: '#71717a' }, children: label }), _jsx("pre", { className: multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-pre-wrap break-all', style: { color: '#e4e4e7', fontFamily: mono ? 'var(--font-mono)' : 'inherit', margin: 0 }, children: value })] }));
}
