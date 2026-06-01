import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { api, queryKeys } from '@/lib/api';
import { PROVIDER_DEFAULTS } from '@soloos/shared';
const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '中文（简体）' },
];
const PROVIDERS = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom'];
const COST_PROVIDERS = ['openai', 'anthropic', 'cursor'];
const PERSONAL_COST_PROVIDERS = ['anthropic', 'cursor', 'codex'];
const HEALTH_KEY = 'soloos-agent-health';
function setAgentHealth(status) {
    if (status === null)
        localStorage.removeItem(HEALTH_KEY);
    else
        localStorage.setItem(HEALTH_KEY, status);
    window.dispatchEvent(new Event('soloos-agent-health-change'));
}
export function Settings() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: config } = useQuery({
        queryKey: queryKeys.agentConfig(),
        queryFn: api.agentConfig.get,
    });
    const { data: githubConfig } = useQuery({
        queryKey: queryKeys.githubConfig(),
        queryFn: api.githubConfig.get,
    });
    const { data: outputBindings = [] } = useQuery({
        queryKey: queryKeys.outputBindings(),
        queryFn: api.output.listBindings,
    });
    const { data: costProviderConfigs = [] } = useQuery({
        queryKey: queryKeys.agentCostProviders(),
        queryFn: api.agentCost.providers,
    });
    const { data: personalSubscriptions = [] } = useQuery({
        queryKey: queryKeys.agentCostPersonalSubscriptions(),
        queryFn: api.agentCost.personalSubscriptions,
    });
    const { data: personalConnectors = [] } = useQuery({
        queryKey: queryKeys.agentCostPersonalConnectors(),
        queryFn: api.agentCost.personalConnectors,
    });
    const { data: projects = [] } = useQuery({
        queryKey: queryKeys.projects(),
        queryFn: api.projects.list,
    });
    const { data: unassignedCosts } = useQuery({
        queryKey: queryKeys.agentCostEvents({ assignment: 'unassigned', limit: 10 }),
        queryFn: () => api.agentCost.events({ assignment: 'unassigned', limit: 10 }),
    });
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [formDirty, setFormDirty] = useState(false);
    const [githubToken, setGithubToken] = useState('');
    const [githubTestStatus, setGithubTestStatus] = useState('idle');
    const [githubTestMsg, setGithubTestMsg] = useState(null);
    const [costForms, setCostForms] = useState({
        openai: { label: '', apiKey: '' },
        anthropic: { label: '', apiKey: '' },
        cursor: { label: '', apiKey: '' },
    });
    const [personalCostForms, setPersonalCostForms] = useState({
        anthropic: { accountType: 'Claude Pro', monthlyAmount: '20.00', billingStatus: 'paid' },
        cursor: { accountType: 'Cursor Pro', monthlyAmount: '20.00', billingStatus: 'paid' },
        codex: { accountType: 'ChatGPT Plus', monthlyAmount: '20.00', billingStatus: 'paid' },
    });
    const [costStatus, setCostStatus] = useState({});
    const [personalCostStatus, setPersonalCostStatus] = useState(null);
    const [selectedCostProjects, setSelectedCostProjects] = useState({});
    const [testPhase, setTestPhase] = useState('idle');
    const [errorDetail, setErrorDetail] = useState(null);
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const { mutate: runTest } = useMutation({
        mutationFn: api.agentConfig.test,
        onSuccess: (result) => {
            if (result.ok) {
                setTestPhase('ok');
                setAgentHealth('ok');
                queryClient.setQueryData(queryKeys.agentHealth(), 'ok');
            }
            else {
                setTestPhase('error');
                setErrorDetail(result);
                setAgentHealth('error');
                queryClient.setQueryData(queryKeys.agentHealth(), 'error');
                setErrorDialogOpen(true);
            }
        },
        onError: (err) => {
            setTestPhase('error');
            setErrorDetail({ ok: false, error: String(err) });
            setAgentHealth('error');
            queryClient.setQueryData(queryKeys.agentHealth(), 'error');
            setErrorDialogOpen(true);
        },
    });
    const { mutate: saveConfig, isPending: saving } = useMutation({
        mutationFn: (body) => api.agentConfig.save(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentConfig() });
            setFormDirty(false);
            setTestPhase('testing');
            setAgentHealth(null);
            runTest();
        },
    });
    const { mutate: deleteConfig } = useMutation({
        mutationFn: api.agentConfig.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentConfig() });
            setProvider('openai');
            setModel('');
            setApiKey('');
            setBaseUrl('');
            setFormDirty(false);
            setTestPhase('idle');
            setAgentHealth(null);
            queryClient.setQueryData(queryKeys.agentHealth(), null);
        },
    });
    const { mutate: saveGithubConfig, isPending: savingGithub } = useMutation({
        mutationFn: (token) => api.githubConfig.save(token),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() });
            setGithubToken('');
            setGithubTestStatus('testing');
            testGithubConfig();
        },
    });
    const { mutate: deleteGithubConfig, isPending: deletingGithub } = useMutation({
        mutationFn: api.githubConfig.delete,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() });
            setGithubTestStatus('idle');
            setGithubTestMsg(null);
        },
    });
    const { mutate: setGithubAutoSync, isPending: togglingGithubAutoSync } = useMutation({
        mutationFn: (enabled) => api.githubConfig.setAutoSync(enabled),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() });
        },
    });
    const { mutate: testGithubConfig, isPending: testingGithub } = useMutation({
        mutationFn: api.githubConfig.test,
        onSuccess: (result) => {
            if (result.ok) {
                setGithubTestStatus('ok');
                setGithubTestMsg(result.login ? `@${result.login}` : t('settings.testOk'));
            }
            else {
                setGithubTestStatus('error');
                setGithubTestMsg(result.error ?? t('settings.testFailed'));
            }
        },
        onError: (err) => {
            setGithubTestStatus('error');
            setGithubTestMsg(String(err));
        },
    });
    const { mutate: saveCostProvider, isPending: savingCostProvider } = useMutation({
        mutationFn: ({ provider: p, label, apiKey: key }) => api.agentCost.saveProvider(p, { label, api_key: key }),
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostProviders() });
            setCostForms((current) => ({ ...current, [saved.provider]: { label: '', apiKey: '' } }));
            setCostStatus((current) => ({ ...current, [saved.provider]: t('settings.savedTokenMasked', { token: saved.api_key_masked }) }));
        },
        onError: (err, vars) => {
            setCostStatus((current) => ({ ...current, [vars.provider]: String(err) }));
        },
    });
    const { mutate: testCostProvider, isPending: testingCostProvider } = useMutation({
        mutationFn: (p) => api.agentCost.testProvider(p),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostProviders() });
            setCostStatus((current) => ({
                ...current,
                [result.provider]: result.ok ? t('settings.testOk') : result.error ?? t('settings.testFailed'),
            }));
        },
        onError: (err, p) => {
            setCostStatus((current) => ({ ...current, [p]: String(err) }));
        },
    });
    const { mutate: syncCostProvider, isPending: syncingCostProvider } = useMutation({
        mutationFn: (p) => {
            const end = Math.floor(Date.now() / 1000);
            const start = end - 7 * 24 * 60 * 60;
            return api.agentCost.syncProvider(p, { start_time: start, end_time: end });
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostProviders() });
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostEvents({ assignment: 'unassigned', limit: 10 }) });
            setCostStatus((current) => ({
                ...current,
                [result.provider]: t('settings.costSyncResult', {
                    imported: result.imported,
                    skipped: result.skipped,
                    unassigned: result.unassigned,
                }),
            }));
        },
        onError: (err, p) => {
            setCostStatus((current) => ({ ...current, [p]: String(err) }));
        },
    });
    const { mutate: deleteCostProvider, isPending: deletingCostProvider } = useMutation({
        mutationFn: (p) => api.agentCost.deleteProvider(p),
        onSuccess: (_, p) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostProviders() });
            setCostStatus((current) => ({ ...current, [p]: t('settings.clear') }));
        },
    });
    const { mutate: assignCostProject, isPending: assigningCostProject } = useMutation({
        mutationFn: ({ eventId, projectId }) => api.agentCost.assignProject(eventId, { project_id: projectId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostEvents({ assignment: 'unassigned', limit: 10 }) });
            queryClient.invalidateQueries({ queryKey: queryKeys.projectEconomics() });
        },
    });
    const { mutate: savePersonalSubscription, isPending: savingPersonalSubscription } = useMutation({
        mutationFn: (p) => {
            const form = personalCostForms[p];
            const existing = personalSubscriptions.find((item) => item.provider === p);
            const body = {
                provider: p,
                account_type: form.accountType.trim() || p,
                billing_status: form.billingStatus,
                monthly_amount: form.billingStatus === 'free' ? '0.00' : form.monthlyAmount.trim(),
                currency: 'USD',
                effective_start: Math.floor(Date.now() / 1000),
            };
            return existing ? api.agentCost.updatePersonalSubscription(existing.id, body) : api.agentCost.savePersonalSubscription(body);
        },
        onSuccess: (subscription) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostPersonalSubscriptions() });
            setPersonalCostStatus(t('settings.personalCostSaved', { provider: subscription.provider }));
        },
        onError: (err) => setPersonalCostStatus(String(err)),
    });
    const { mutate: disablePersonalSubscription, isPending: disablingPersonalSubscription } = useMutation({
        mutationFn: (id) => api.agentCost.disablePersonalSubscription(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostPersonalSubscriptions() });
            setPersonalCostStatus(t('settings.personalCostDisabled'));
        },
    });
    const { mutate: allocatePersonalActivity, isPending: allocatingPersonalActivity } = useMutation({
        mutationFn: () => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return api.agentCost.allocatePersonalActivity(Math.floor(now.getTime() / 1000));
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agentCostEvents({ assignment: 'unassigned', limit: 10 }) });
            queryClient.invalidateQueries({ queryKey: queryKeys.projectEconomics() });
            setPersonalCostStatus(t('settings.personalCostSyncResult', {
                imported: result.imported,
                skipped: result.skipped,
                unallocated: result.unallocated,
            }));
        },
        onError: (err) => setPersonalCostStatus(String(err)),
    });
    function handleProviderChange(p) {
        setProvider(p);
        const defaults = PROVIDER_DEFAULTS[p];
        setModel(defaults.model);
        setBaseUrl(defaults.base_url ?? '');
        setFormDirty(true);
        setTestPhase('idle');
    }
    function handleSave() {
        const effectiveModel = model.trim() || PROVIDER_DEFAULTS[provider].model;
        saveConfig({
            provider,
            model: effectiveModel,
            api_key: apiKey.trim(),
            base_url: baseUrl.trim() || undefined,
        });
    }
    function changeLang(code) {
        i18n.changeLanguage(code);
        localStorage.setItem('soloos-lang', code);
    }
    function updateCostForm(p, patch) {
        setCostForms((current) => ({ ...current, [p]: { ...current[p], ...patch } }));
    }
    function updatePersonalCostForm(p, patch) {
        setPersonalCostForms((current) => ({ ...current, [p]: { ...current[p], ...patch } }));
    }
    function saveCostConfig(p) {
        const saved = costProviderConfigs.find((item) => item.provider === p);
        const form = costForms[p];
        saveCostProvider({
            provider: p,
            label: form.label.trim() || saved?.label || p,
            apiKey: form.apiKey.trim(),
        });
    }
    const hasApiKey = !!apiKey.trim();
    const isBusy = saving || testPhase === 'testing';
    return (_jsxs("div", { className: "w-full max-w-5xl mx-auto flex flex-col gap-6", children: [_jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.agentConfig') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.agentConfigDesc') })] }), config && testPhase === 'idle' && (_jsxs("div", { className: "text-xs font-mono px-3 py-2 rounded-lg", style: { background: '#18181b', color: '#10b981', border: '1px solid #10b98130' }, children: [t('settings.configuredAs', { provider: config.provider, model: config.model }), _jsx("span", { className: "ml-2", style: { color: '#3f3f46' }, children: config.api_key_masked })] })), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.provider') }), _jsx("div", { className: "flex flex-wrap gap-2", children: PROVIDERS.map(p => (_jsx("button", { onClick: () => handleProviderChange(p), className: "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", style: {
                                        background: provider === p ? '#18181b' : 'transparent',
                                        border: `1px solid ${provider === p ? '#6366f1' : '#27272a'}`,
                                        color: provider === p ? '#e4e4e7' : '#71717a',
                                    }, children: p }, p))) })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.model') }), _jsx("input", { type: "text", value: model, onChange: e => { setModel(e.target.value); setFormDirty(true); }, placeholder: PROVIDER_DEFAULTS[provider].model, className: "rounded-lg px-3 py-2 text-sm font-mono", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.apiKey') }), _jsx("input", { type: "password", value: apiKey, onChange: e => { setApiKey(e.target.value); setFormDirty(true); }, placeholder: t('settings.apiKeyPlaceholder'), className: "rounded-lg px-3 py-2 text-sm font-mono", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } })] }), (provider === 'ollama' || provider === 'custom') && (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.baseUrl') }), _jsx("input", { type: "text", value: baseUrl, onChange: e => { setBaseUrl(e.target.value); setFormDirty(true); }, placeholder: t('settings.baseUrlPlaceholder'), className: "rounded-lg px-3 py-2 text-sm font-mono", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } })] })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { onClick: handleSave, disabled: !hasApiKey || isBusy, className: "flex-shrink-0 gap-1.5", children: saving ? _jsxs(_Fragment, { children: [_jsx(Loader2, { size: 13, className: "animate-spin" }), " ", t('settings.saving')] }) :
                                    testPhase === 'testing' ? _jsxs(_Fragment, { children: [_jsx(Loader2, { size: 13, className: "animate-spin" }), " ", t('settings.testing')] }) :
                                        testPhase === 'ok' ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 13 }), " ", t('settings.testOk')] }) :
                                            t('settings.save') }), config && !isBusy && (_jsx(Button, { variant: "outline", onClick: () => deleteConfig(), className: "flex-shrink-0", style: { borderColor: '#ef444433', color: '#ef4444' }, children: t('settings.clear') })), testPhase === 'error' && (_jsxs("button", { onClick: () => setErrorDialogOpen(true), className: "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg", style: { background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }, children: [_jsx(AlertCircle, { size: 12 }), t('settings.testFailed'), " \u2014 ", t('settings.viewDetails')] }))] })] }), _jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.githubConfig') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.githubConfigDesc') })] }), githubConfig && (_jsx("div", { className: "text-xs font-mono px-3 py-2 rounded-lg", style: { background: '#18181b', color: '#10b981', border: '1px solid #10b98130' }, children: t('settings.savedTokenMasked', { token: githubConfig.token_masked }) })), githubConfig && (_jsxs("div", { className: "flex items-center justify-between rounded-lg border px-3 py-2", style: { borderColor: '#27272a', background: '#18181b' }, children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium", style: { color: '#e4e4e7' }, children: t('settings.githubAutoSync') }), _jsx("span", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.githubAutoSyncDesc') })] }), _jsx("button", { type: "button", onClick: () => setGithubAutoSync(!githubConfig.auto_sync_enabled), disabled: togglingGithubAutoSync, className: "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", style: {
                                    background: githubConfig.auto_sync_enabled ? '#14532d20' : '#3f3f4620',
                                    border: `1px solid ${githubConfig.auto_sync_enabled ? '#4ade8033' : '#3f3f46'}`,
                                    color: githubConfig.auto_sync_enabled ? '#4ade80' : '#a1a1aa',
                                }, children: githubConfig.auto_sync_enabled ? t('settings.enabled') : t('settings.disabled') })] })), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.apiKey') }), _jsx("input", { type: "password", value: githubToken, onChange: e => setGithubToken(e.target.value), placeholder: t('settings.githubApiKeyPlaceholder'), className: "rounded-lg px-3 py-2 text-sm font-mono", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { onClick: () => saveGithubConfig(githubToken.trim()), disabled: !githubToken.trim() || savingGithub, children: savingGithub ? t('settings.saving') : t('settings.save') }), _jsx(Button, { variant: "outline", onClick: () => {
                                    setGithubTestStatus('testing');
                                    testGithubConfig();
                                }, disabled: !githubConfig || testingGithub, children: testingGithub ? t('settings.testing') : t('settings.testConnection') }), githubConfig && (_jsx(Button, { variant: "outline", onClick: () => deleteGithubConfig(), disabled: deletingGithub, style: { borderColor: '#ef444433', color: '#ef4444' }, children: t('settings.clear') }))] }), githubTestStatus !== 'idle' && githubTestMsg && (_jsx("div", { className: "text-xs px-3 py-2 rounded-lg", style: {
                            background: githubTestStatus === 'ok' ? '#14532d20' : '#7f1d1d20',
                            color: githubTestStatus === 'ok' ? '#4ade80' : '#fca5a5',
                        }, children: githubTestMsg })), _jsxs("div", { className: "rounded-lg border", style: { borderColor: '#27272a' }, children: [_jsx("div", { className: "px-3 py-2 text-xs", style: { color: '#71717a', borderBottom: '1px solid #27272a' }, children: t('settings.boundRepos') }), outputBindings.length === 0 ? (_jsx("div", { className: "px-3 py-3 text-xs", style: { color: '#52525b' }, children: t('settings.noBoundRepos') })) : (_jsx("div", { children: outputBindings.map((b) => (_jsx("div", { className: "px-3 py-2 text-xs flex items-center justify-between gap-3 border-b", style: { borderColor: '#18181b' }, children: _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "truncate", style: { color: '#e4e4e7' }, children: b.repo_full_name }), _jsx("div", { style: { color: '#71717a' }, children: b.project_id ?? t('output.stateLabel.DRAFT') })] }) }, b.id))) }))] }), _jsx("div", { children: _jsx(Button, { variant: "outline", onClick: () => navigate('/output'), children: t('settings.goToOutputToEdit') }) })] }), _jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.agentCostProviders') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.agentCostProvidersDesc') })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-3", children: COST_PROVIDERS.map((p) => {
                            const saved = costProviderConfigs.find((item) => item.provider === p);
                            const busy = savingCostProvider || testingCostProvider || syncingCostProvider || deletingCostProvider;
                            return (_jsxs("div", { className: "rounded-lg border p-3 flex flex-col gap-3", style: { borderColor: '#27272a', background: '#18181b' }, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold capitalize", style: { color: '#e4e4e7' }, children: p }), _jsx("div", { className: "text-[11px] font-mono", style: { color: saved ? '#4ade80' : '#52525b' }, children: saved ? saved.api_key_masked : t('settings.noConfig') })] }), saved && (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded capitalize", style: {
                                                    background: saved.status === 'ok' ? '#14532d20' : saved.status === 'error' ? '#7f1d1d20' : '#3f3f4620',
                                                    color: saved.status === 'ok' ? '#4ade80' : saved.status === 'error' ? '#fca5a5' : '#a1a1aa',
                                                }, children: saved.status }))] }), _jsx("input", { type: "text", value: costForms[p].label, onChange: e => updateCostForm(p, { label: e.target.value }), placeholder: saved?.label ?? `${p} team`, className: "rounded-lg px-3 py-2 text-xs", style: { background: '#111', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } }), _jsx("input", { type: "password", value: costForms[p].apiKey, onChange: e => updateCostForm(p, { apiKey: e.target.value }), placeholder: t('settings.costApiKeyPlaceholder'), className: "rounded-lg px-3 py-2 text-xs font-mono", style: { background: '#111', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Button, { size: "sm", onClick: () => saveCostConfig(p), disabled: !costForms[p].apiKey.trim() || busy, children: savingCostProvider ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : t('settings.save') }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => testCostProvider(p), disabled: !saved || busy, children: testingCostProvider ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : t('settings.testConnection') }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => syncCostProvider(p), disabled: !saved || busy, className: "gap-1.5", children: [syncingCostProvider ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : _jsx(RefreshCw, { size: 13 }), t('settings.sync')] }), saved && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => deleteCostProvider(p), disabled: busy, style: { borderColor: '#ef444433', color: '#ef4444' }, children: _jsx(Trash2, { size: 13 }) }))] }), costStatus[p] && (_jsx("div", { className: "text-[11px] rounded px-2 py-1", style: { background: '#111', color: '#a1a1aa' }, children: costStatus[p] }))] }, p));
                        }) }), _jsxs("div", { className: "rounded-lg border p-3 flex flex-col gap-3", style: { borderColor: '#27272a', background: '#18181b' }, children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-medium", style: { color: '#e4e4e7' }, children: t('settings.personalAgentCost') }), _jsx("div", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.personalAgentCostDesc') })] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => allocatePersonalActivity(), disabled: allocatingPersonalActivity, className: "gap-1.5", children: [allocatingPersonalActivity ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : _jsx(RefreshCw, { size: 13 }), t('settings.sync')] })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-3", children: PERSONAL_COST_PROVIDERS.map((p) => {
                                    const saved = personalSubscriptions.find((item) => item.provider === p);
                                    const connector = personalConnectors.find((item) => item.provider === p);
                                    const busy = savingPersonalSubscription || disablingPersonalSubscription;
                                    return (_jsxs("div", { className: "rounded-md border p-3 flex flex-col gap-2", style: { borderColor: '#27272a', background: '#111' }, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold capitalize", style: { color: '#e4e4e7' }, children: p }), _jsx("div", { className: "text-[11px] font-mono", style: { color: connector?.status === 'installed' ? '#4ade80' : '#71717a' }, children: connector ? `${connector.cli}: ${connector.status}` : t('settings.detecting') })] }), saved && (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded", style: { background: saved.enabled ? '#14532d20' : '#3f3f4620', color: saved.enabled ? '#4ade80' : '#a1a1aa' }, children: saved.enabled ? saved.billing_status : t('settings.disabled') }))] }), _jsx("input", { type: "text", value: personalCostForms[p].accountType, onChange: e => updatePersonalCostForm(p, { accountType: e.target.value }), className: "rounded-lg px-3 py-2 text-xs", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } }), _jsxs("div", { className: "grid grid-cols-[1fr_96px] gap-2", children: [_jsxs("select", { value: personalCostForms[p].billingStatus, onChange: e => updatePersonalCostForm(p, { billingStatus: e.target.value }), className: "rounded-lg px-3 py-2 text-xs", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }, children: [_jsx("option", { value: "paid", children: t('settings.paid') }), _jsx("option", { value: "free", children: t('settings.free') }), _jsx("option", { value: "unpaid", children: t('settings.unpaid') })] }), _jsx("input", { type: "number", min: "0", step: "0.01", value: personalCostForms[p].monthlyAmount, onChange: e => updatePersonalCostForm(p, { monthlyAmount: e.target.value }), disabled: personalCostForms[p].billingStatus === 'free', className: "rounded-lg px-3 py-2 text-xs", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' } })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", onClick: () => savePersonalSubscription(p), disabled: busy, children: savingPersonalSubscription ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : t('settings.save') }), saved?.enabled && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => disablePersonalSubscription(saved.id), disabled: busy, children: t('settings.disable') }))] })] }, p));
                                }) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-md px-3 py-2", style: { background: '#111', border: '1px solid #27272a' }, children: [_jsx("div", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.officialCost') }), _jsx("div", { className: "text-xs font-mono", style: { color: '#e4e4e7' }, children: t('settings.availableInReview') })] }), _jsxs("div", { className: "rounded-md px-3 py-2", style: { background: '#111', border: '1px solid #27272a' }, children: [_jsx("div", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.personalAllocatedCost') }), _jsx("div", { className: "text-xs font-mono", style: { color: '#e4e4e7' }, children: t('settings.availableInReview') })] }), _jsxs("div", { className: "rounded-md px-3 py-2", style: { background: '#111', border: '1px solid #27272a' }, children: [_jsx("div", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.personalUnallocatedCost') }), _jsx("div", { className: "text-xs font-mono", style: { color: '#e4e4e7' }, children: t('settings.availableInReview') })] })] }), personalCostStatus && (_jsx("div", { className: "text-[11px] rounded px-2 py-1", style: { background: '#111', color: '#a1a1aa' }, children: personalCostStatus }))] }), _jsxs("div", { className: "rounded-lg border", style: { borderColor: '#27272a' }, children: [_jsxs("div", { className: "px-3 py-2 border-b flex items-center justify-between gap-3", style: { borderColor: '#27272a' }, children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-medium", style: { color: '#e4e4e7' }, children: t('settings.unassignedCosts') }), _jsx("div", { className: "text-[11px]", style: { color: '#71717a' }, children: t('settings.unassignedCostsDesc') })] }), _jsx("span", { className: "text-xs font-mono", style: { color: '#a1a1aa' }, children: unassignedCosts?.items.length ?? 0 })] }), !unassignedCosts || unassignedCosts.items.length === 0 ? (_jsx("div", { className: "px-3 py-3 text-xs", style: { color: '#52525b' }, children: t('settings.noUnassignedCosts') })) : (_jsx("div", { className: "divide-y", style: { borderColor: '#18181b' }, children: unassignedCosts.items.map((event) => (_jsxs("div", { className: "grid gap-2 px-3 py-2 md:grid-cols-[1fr_180px_auto] md:items-center", style: { borderColor: '#18181b' }, children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-xs font-medium truncate", style: { color: '#e4e4e7' }, children: [event.provider, " \u00B7 ", event.model ?? event.line_item ?? event.provider_project_id ?? event.id] }), _jsxs("div", { className: "text-[11px] font-mono truncate", style: { color: '#71717a' }, children: [event.currency, " ", event.amount, " \u00B7 ", event.provider_project_id ?? event.line_item ?? '-'] })] }), _jsxs("select", { value: selectedCostProjects[event.id] ?? '', onChange: e => setSelectedCostProjects((current) => ({ ...current, [event.id]: e.target.value })), className: "rounded-lg px-3 py-2 text-xs", style: { background: '#111', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }, children: [_jsx("option", { value: "", children: t('settings.chooseProject') }), projects.map((project) => (_jsx("option", { value: project.id, children: project.name }, project.id)))] }), _jsx(Button, { size: "sm", variant: "outline", disabled: !selectedCostProjects[event.id] || assigningCostProject, onClick: () => assignCostProject({ eventId: event.id, projectId: selectedCostProjects[event.id] }), children: assigningCostProject ? t('settings.assigning') : t('settings.assign') })] }, event.id))) }))] })] }), _jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.language') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.languageDesc') })] }), _jsx("div", { className: "flex gap-2", children: LANGUAGES.map(lang => {
                            const active = i18n.language === lang.code;
                            return (_jsxs("button", { onClick: () => changeLang(lang.code), className: "px-4 py-2 rounded-lg text-sm font-medium transition-colors", style: {
                                    background: active ? '#18181b' : 'transparent',
                                    border: `1px solid ${active ? '#6366f1' : '#27272a'}`,
                                    color: active ? '#e4e4e7' : '#71717a',
                                }, children: [lang.label, active && (_jsx("span", { className: "ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle", style: { background: '#6366f1' } }))] }, lang.code));
                        }) })] }), errorDetail && (_jsx(Dialog, { open: errorDialogOpen, onOpenChange: setErrorDialogOpen, children: _jsxs(DialogContent, { className: "sm:max-w-2xl", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-sm", style: { color: '#ef4444' }, children: [_jsx(AlertCircle, { size: 14 }), t('settings.testFailedTitle')] }) }), _jsxs("div", { className: "flex flex-col gap-3 text-xs overflow-hidden", children: [errorDetail.url && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold uppercase tracking-widest", style: { color: '#52525b' }, children: t('settings.errorUrl') }), _jsx("code", { className: "px-2 py-1.5 rounded break-all", style: { background: '#18181b', color: '#a1a1aa' }, children: errorDetail.url.replace(/key=[^&]+/, 'key=***') })] })), errorDetail.request_body && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold uppercase tracking-widest", style: { color: '#52525b' }, children: t('settings.errorRequest') }), _jsx("pre", { className: "px-2 py-1.5 rounded overflow-x-auto text-xs", style: { background: '#18181b', color: '#a1a1aa', maxHeight: 120 }, children: (() => {
                                                try {
                                                    return JSON.stringify(JSON.parse(errorDetail.request_body), null, 2);
                                                }
                                                catch {
                                                    return errorDetail.request_body;
                                                }
                                            })() })] })), errorDetail.response_status !== undefined && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("span", { className: "font-semibold uppercase tracking-widest", style: { color: '#52525b' }, children: [t('settings.errorResponse'), " (HTTP ", errorDetail.response_status, ")"] }), _jsx("pre", { className: "px-2 py-1.5 rounded overflow-x-auto text-xs", style: { background: '#18181b', color: '#ef4444', maxHeight: 200 }, children: (() => {
                                                try {
                                                    return JSON.stringify(JSON.parse(errorDetail.response_body ?? ''), null, 2);
                                                }
                                                catch {
                                                    return errorDetail.response_body;
                                                }
                                            })() })] })), errorDetail.error && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold uppercase tracking-widest", style: { color: '#52525b' }, children: t('settings.errorMessage') }), _jsx("code", { className: "px-2 py-1.5 rounded", style: { background: '#18181b', color: '#ef4444' }, children: errorDetail.error })] }))] })] }) }))] }));
}
