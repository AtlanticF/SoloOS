import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Info } from 'lucide-react';
import { api, queryKeys } from '@/lib/api';
export function RepoProjectBindingDialog({ open, onOpenChange, projects, existingBinding, presetRepo }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const isEdit = !!existingBinding;
    const [repoId, setRepoId] = useState(presetRepo?.id?.toString() ?? existingBinding?.repo_id?.toString() ?? '');
    const [repoFullName, setRepoFullName] = useState(presetRepo?.full_name ?? existingBinding?.repo_full_name ?? '');
    const [projectId, setProjectId] = useState(existingBinding?.project_id ?? '');
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const isPresetRepo = !!presetRepo;
    useEffect(() => {
        if (!open)
            return;
        setRepoId(presetRepo?.id?.toString() ?? existingBinding?.repo_id?.toString() ?? '');
        setRepoFullName(presetRepo?.full_name ?? existingBinding?.repo_full_name ?? '');
        setProjectId(existingBinding?.project_id ?? '');
        setShowCreateProject(false);
        setNewProjectName('');
    }, [open, presetRepo, existingBinding]);
    function getDefaultProjectNameFromRepo(fullName) {
        const parts = fullName.split('/').filter(Boolean);
        return parts.length > 1 ? parts[parts.length - 1] : fullName.trim();
    }
    const { mutate: createProject, isPending: isCreatingProject } = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName.trim() }),
            });
            if (!res.ok)
                throw new Error(`API error: ${res.status}`);
            return res.json();
        },
        onSuccess: (project) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
            setProjectId(project.id);
            setShowCreateProject(false);
            setNewProjectName('');
        },
    });
    const { mutate: save, isPending } = useMutation({
        mutationFn: () => {
            const [, repoName] = repoFullName.split('/');
            return api.output.upsertBinding({
                repo_id: Number(repoId),
                repo_name: repoName ?? repoFullName,
                repo_full_name: repoFullName,
                project_id: projectId || null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.outputBindings() });
            queryClient.invalidateQueries({ queryKey: queryKeys.outputSyncStatus() });
            // Trigger initial sync after binding
            api.output.triggerSync(Number(repoId)).catch(() => { });
            onOpenChange(false);
        },
    });
    if (!open)
        return null;
    const canSave = repoFullName.includes('/') && repoId !== '';
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center", style: { background: 'rgba(0,0,0,0.7)' }, children: _jsxs("div", { className: "relative w-full max-w-md rounded-xl border p-6 shadow-2xl", style: { background: '#0d0d0d', borderColor: '#27272a' }, children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("h2", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: isEdit
                                ? t('output.bindingDialog.titleEdit')
                                : t('output.bindingDialog.titleCreate') }), _jsx("button", { onClick: () => onOpenChange(false), className: "text-zinc-600 hover:text-zinc-300 transition-colors", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs mb-1.5", style: { color: '#71717a' }, children: t('output.bindingDialog.repoLabel') }), _jsx("input", { value: repoFullName, onChange: e => {
                                        setRepoFullName(e.target.value);
                                        // Use a placeholder numeric repo_id for manual entry — real apps would use /user/repos API
                                        if (!repoId)
                                            setRepoId('0');
                                    }, placeholder: t('output.bindingDialog.repoPlaceholder'), disabled: isEdit || isPresetRepo, className: "w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors", style: {
                                        background: '#18181b',
                                        borderColor: '#27272a',
                                        color: '#e4e4e7',
                                        opacity: (isEdit || isPresetRepo) ? 0.6 : 1,
                                    } }), !isEdit && !isPresetRepo && (_jsxs("p", { className: "text-xs mt-1", style: { color: '#3f3f46' }, children: ["Enter the full repo name, e.g. ", _jsx("code", { className: "font-mono", children: "matt/soloos" })] }))] }), !isEdit && !isPresetRepo && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs mb-1.5", style: { color: '#71717a' }, children: "GitHub Repo ID" }), _jsx("input", { value: repoId, onChange: e => setRepoId(e.target.value), placeholder: "e.g. 123456", type: "number", className: "w-full text-sm px-3 py-2 rounded-lg border outline-none", style: { background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' } }), _jsxs("p", { className: "text-xs mt-1", style: { color: '#3f3f46' }, children: ["Find it at: ", _jsx("code", { className: "font-mono", children: "https://api.github.com/repos/owner/repo" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs mb-1.5", style: { color: '#71717a' }, children: t('output.bindingDialog.projectLabel') }), _jsxs("select", { value: projectId, onChange: e => setProjectId(e.target.value), className: "w-full text-sm px-3 py-2 rounded-lg border outline-none", style: { background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }, children: [_jsx("option", { value: "", children: t('output.bindingDialog.projectPlaceholder') }), projects.map(p => (_jsx("option", { value: p.id, children: p.name }, p.id)))] }), !showCreateProject ? (_jsx("button", { onClick: () => {
                                        setShowCreateProject(true);
                                        if (!newProjectName.trim()) {
                                            setNewProjectName(getDefaultProjectNameFromRepo(repoFullName));
                                        }
                                    }, className: "text-xs mt-2 px-2.5 py-1.5 rounded-md border transition-colors hover:border-zinc-500", style: { background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }, children: t('output.bindingDialog.createProject') })) : (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("input", { value: newProjectName, onChange: (e) => setNewProjectName(e.target.value), placeholder: t('output.bindingDialog.newProjectPlaceholder'), className: "flex-1 text-sm px-3 py-2 rounded-lg border outline-none", style: { background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' } }), _jsx("button", { onClick: () => createProject(), disabled: !newProjectName.trim() || isCreatingProject, className: "text-xs px-2.5 py-2 rounded-md border disabled:opacity-50", style: { background: '#18181b', borderColor: '#4ade8040', color: '#4ade80' }, children: isCreatingProject ? t('output.bindingDialog.creatingProject') : t('output.bindingDialog.confirmCreateProject') }), _jsx("button", { onClick: () => { setShowCreateProject(false); setNewProjectName(''); }, className: "text-xs px-2.5 py-2 rounded-md border", style: { background: 'transparent', borderColor: '#27272a', color: '#71717a' }, children: t('output.bindingDialog.cancel') })] }))] }), isEdit && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs", style: { background: '#78350f15', borderLeft: '3px solid #fbbf2440', color: '#fbbf24' }, children: [_jsx(Info, { size: 12, className: "flex-shrink-0 mt-0.5" }), t('output.bindingDialog.forwardOnlyNote')] }))] }), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { onClick: () => onOpenChange(false), className: "text-sm px-4 py-2 rounded-lg border transition-colors hover:border-zinc-600", style: { background: 'transparent', borderColor: '#27272a', color: '#71717a' }, children: t('output.bindingDialog.cancel') }), _jsx("button", { onClick: () => save(), disabled: !canSave || isPending, className: "text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50", style: { background: '#18181b', border: '1px solid #4ade8040', color: '#4ade80' }, children: isPending ? t('output.bindingDialog.saving') : t('output.bindingDialog.save') })] })] }) }));
}
