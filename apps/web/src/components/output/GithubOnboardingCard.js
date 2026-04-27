import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Github, Loader2 } from 'lucide-react';
import { api, queryKeys } from '@/lib/api';
import { useTranslation } from 'react-i18next';
export function GithubOnboardingCard({ onBindRepo, mode = 'onboarding', importedRepoIds = [] }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const isManageMode = mode === 'manage';
    const importedRepoIdSet = useMemo(() => new Set(importedRepoIds), [importedRepoIds]);
    const [tokenInput, setTokenInput] = useState('');
    const [repoSearch, setRepoSearch] = useState('');
    const [testMessage, setTestMessage] = useState(null);
    const [didTestOk, setDidTestOk] = useState(false);
    const [autoChecked, setAutoChecked] = useState(false);
    const { data: config } = useQuery({
        queryKey: queryKeys.githubConfig(),
        queryFn: api.githubConfig.get,
    });
    const { mutate: saveToken, isPending: savingToken } = useMutation({
        mutationFn: (token) => api.githubConfig.save(token),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() });
            setAutoChecked(false);
            setDidTestOk(false);
            setTestMessage(null);
        },
    });
    const { mutate: testToken, isPending: testingToken } = useMutation({
        mutationFn: api.githubConfig.test,
        onSuccess: async (result) => {
            if (result.ok) {
                setDidTestOk(true);
                setTestMessage(result.login ? `@${result.login}` : 'Connected');
                await queryClient.invalidateQueries({ queryKey: queryKeys.githubRepos() });
            }
            else {
                setDidTestOk(false);
                setTestMessage(result.error ?? 'Validation failed');
            }
        },
        onError: (err) => {
            setDidTestOk(false);
            setTestMessage(String(err));
        },
    });
    const { data: reposData, isLoading: reposLoading, } = useQuery({
        queryKey: queryKeys.githubRepos(),
        queryFn: api.githubConfig.repos,
        enabled: !!config && (isManageMode ? didTestOk : true),
    });
    useEffect(() => {
        if (!isManageMode)
            return;
        if (!config)
            return;
        if (autoChecked)
            return;
        setAutoChecked(true);
        testToken();
    }, [isManageMode, config, autoChecked, testToken]);
    const repos = useMemo(() => reposData?.repos ?? [], [reposData]);
    const filteredRepos = useMemo(() => {
        const keyword = repoSearch.trim().toLowerCase();
        if (!keyword)
            return repos;
        return repos.filter((repo) => repo.full_name.toLowerCase().includes(keyword) ||
            repo.name.toLowerCase().includes(keyword));
    }, [repos, repoSearch]);
    const checkingExistingToken = isManageMode && !!config && !autoChecked;
    const shouldShowTokenForm = !isManageMode || !config || (!didTestOk && autoChecked);
    return (_jsxs("div", { className: "rounded-xl border p-5 flex flex-col gap-4", style: { background: '#0d0d0d', borderColor: '#27272a' }, children: [!isManageMode && (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-9 h-9 rounded-lg flex items-center justify-center", style: { background: '#18181b' }, children: _jsx(Github, { size: 18, style: { color: '#e4e4e7' } }) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: t('output.githubSetupTitle') }), _jsx("div", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('output.githubSetupSteps') }), _jsx("a", { className: "text-xs inline-block mt-2 underline", style: { color: '#60a5fa' }, href: "https://github.com/settings/tokens?type=beta", target: "_blank", rel: "noreferrer", children: t('output.openGithubTokenGuide') })] })] })), shouldShowTokenForm && (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "password", value: tokenInput, onChange: (e) => setTokenInput(e.target.value), placeholder: config ? t('output.githubTokenReplacePlaceholder') : t('output.githubTokenPlaceholder'), className: "flex-1 rounded-lg px-3 py-2 text-sm font-mono", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7' } }), _jsx("button", { onClick: () => saveToken(tokenInput.trim()), disabled: !tokenInput.trim() || savingToken, className: "px-3 py-2 rounded-lg text-sm disabled:opacity-50", style: { background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7' }, children: savingToken ? t('output.saving') : t('output.save') }), _jsx("button", { onClick: () => testToken(), disabled: !config || testingToken, className: "px-3 py-2 rounded-lg text-sm disabled:opacity-50", style: { background: '#14532d20', border: '1px solid #4ade8040', color: '#4ade80' }, children: testingToken ? t('output.validating') : t('output.validate') })] })), config && (_jsxs("div", { className: "text-xs rounded-lg px-3 py-2", style: { background: '#18181b', color: '#a1a1aa' }, children: [t('output.savedToken'), ": ", _jsx("span", { className: "font-mono", children: config.token_masked })] })), checkingExistingToken && (_jsxs("div", { className: "text-xs rounded-lg px-3 py-2 flex items-center gap-2", style: { background: '#18181b', color: '#a1a1aa' }, children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), t('output.validating')] })), testMessage && (_jsxs("div", { className: "text-xs rounded-lg px-3 py-2 flex items-center gap-2", style: { background: didTestOk ? '#14532d20' : '#7f1d1d20', color: didTestOk ? '#4ade80' : '#fca5a5' }, children: [didTestOk ? _jsx(CheckCircle2, { size: 12 }) : null, testMessage] })), _jsxs("div", { className: "rounded-lg border", style: { borderColor: '#27272a' }, children: [_jsx("div", { className: "px-3 py-2 text-xs", style: { color: '#71717a', borderBottom: '1px solid #27272a' }, children: t('output.availableRepos') }), !reposLoading && repos.length > 0 && (_jsx("div", { className: "px-3 py-2 border-b", style: { borderColor: '#18181b' }, children: _jsx("input", { type: "text", value: repoSearch, onChange: (e) => setRepoSearch(e.target.value), placeholder: t('output.searchReposPlaceholder'), className: "w-full rounded-lg px-3 py-2 text-sm", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7' } }) })), reposLoading ? (_jsxs("div", { className: "p-4 text-xs flex items-center gap-2", style: { color: '#a1a1aa' }, children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), t('output.loadingRepos')] })) : repos.length === 0 ? (_jsx("div", { className: "p-4 text-xs", style: { color: '#52525b' }, children: t('output.noReposFound') })) : filteredRepos.length === 0 ? (_jsx("div", { className: "p-4 text-xs", style: { color: '#52525b' }, children: t('output.noRepoMatches') })) : (_jsx("div", { className: "max-h-72 overflow-y-auto", children: filteredRepos.map((repo) => (_jsxs("div", { className: "px-3 py-2 border-b flex items-center justify-between gap-3", style: { borderColor: '#18181b' }, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm truncate", style: { color: '#e4e4e7' }, children: repo.full_name }), _jsx("div", { className: "text-xs", style: { color: '#71717a' }, children: repo.private ? t('output.privateRepo') : t('output.publicRepo') })] }), importedRepoIdSet.has(repo.id) ? (_jsx("span", { className: "px-3 py-1.5 rounded-lg text-sm border", style: { background: '#18181b', borderColor: '#3f3f46', color: '#a1a1aa' }, children: t('output.importedRepo') })) : (_jsx("button", { onClick: () => onBindRepo(repo), className: "px-3 py-1.5 rounded-lg text-sm", style: { background: '#f4f4f5', color: '#111827' }, children: t('output.importRepo') }))] }, repo.id))) }))] })] }));
}
