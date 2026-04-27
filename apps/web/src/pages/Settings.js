import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { api, queryKeys } from '@/lib/api';
import { PROVIDER_DEFAULTS } from '@soloos/shared';
const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '中文（简体）' },
];
const PROVIDERS = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom'];
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
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [formDirty, setFormDirty] = useState(false);
    const [githubToken, setGithubToken] = useState('');
    const [githubTestStatus, setGithubTestStatus] = useState('idle');
    const [githubTestMsg, setGithubTestMsg] = useState(null);
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
    const hasApiKey = !!apiKey.trim();
    const isBusy = saving || testPhase === 'testing';
    return (_jsxs("div", { className: "w-full max-w-xl mx-auto flex flex-col gap-6", children: [_jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.agentConfig') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.agentConfigDesc') })] }), config && testPhase === 'idle' && (_jsxs("div", { className: "text-xs font-mono px-3 py-2 rounded-lg", style: { background: '#18181b', color: '#10b981', border: '1px solid #10b98130' }, children: [t('settings.configuredAs', { provider: config.provider, model: config.model }), _jsx("span", { className: "ml-2", style: { color: '#3f3f46' }, children: config.api_key_masked })] })), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('settings.provider') }), _jsx("div", { className: "flex flex-wrap gap-2", children: PROVIDERS.map(p => (_jsx("button", { onClick: () => handleProviderChange(p), className: "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", style: {
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
                        }, children: githubTestMsg })), _jsxs("div", { className: "rounded-lg border", style: { borderColor: '#27272a' }, children: [_jsx("div", { className: "px-3 py-2 text-xs", style: { color: '#71717a', borderBottom: '1px solid #27272a' }, children: t('settings.boundRepos') }), outputBindings.length === 0 ? (_jsx("div", { className: "px-3 py-3 text-xs", style: { color: '#52525b' }, children: t('settings.noBoundRepos') })) : (_jsx("div", { children: outputBindings.map((b) => (_jsx("div", { className: "px-3 py-2 text-xs flex items-center justify-between gap-3 border-b", style: { borderColor: '#18181b' }, children: _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "truncate", style: { color: '#e4e4e7' }, children: b.repo_full_name }), _jsx("div", { style: { color: '#71717a' }, children: b.project_id ?? t('output.stateLabel.DRAFT') })] }) }, b.id))) }))] }), _jsx("div", { children: _jsx(Button, { variant: "outline", onClick: () => navigate('/output'), children: t('settings.goToOutputToEdit') }) })] }), _jsxs("section", { className: "rounded-xl p-5 flex flex-col gap-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-0.5", style: { color: '#52525b' }, children: t('settings.language') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('settings.languageDesc') })] }), _jsx("div", { className: "flex gap-2", children: LANGUAGES.map(lang => {
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
