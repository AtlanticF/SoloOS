import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, queryKeys, type AgentTestResult } from '@/lib/api'
import type { AgentProvider, AgentConfigInput } from '@soloos/shared'
import { PROVIDER_DEFAULTS } from '@soloos/shared'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '中文（简体）' },
]

const PROVIDERS: AgentProvider[] = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom']

const HEALTH_KEY = 'soloos-agent-health'

function setAgentHealth(status: 'ok' | 'error' | null) {
  if (status === null) localStorage.removeItem(HEALTH_KEY)
  else localStorage.setItem(HEALTH_KEY, status)
  window.dispatchEvent(new Event('soloos-agent-health-change'))
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: queryKeys.agentConfig(),
    queryFn: api.agentConfig.get,
  })
  const { data: githubConfig } = useQuery({
    queryKey: queryKeys.githubConfig(),
    queryFn: api.githubConfig.get,
  })
  const { data: outputBindings = [] } = useQuery({
    queryKey: queryKeys.outputBindings(),
    queryFn: api.output.listBindings,
  })

  const [provider, setProvider] = useState<AgentProvider>('openai')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [formDirty, setFormDirty] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [githubTestStatus, setGithubTestStatus] = useState<'idle' | 'ok' | 'error' | 'testing'>('idle')
  const [githubTestMsg, setGithubTestMsg] = useState<string | null>(null)

  const [testPhase, setTestPhase] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [errorDetail, setErrorDetail] = useState<AgentTestResult | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)

  const { mutate: runTest } = useMutation({
    mutationFn: api.agentConfig.test,
    onSuccess: (result) => {
      if (result.ok) {
        setTestPhase('ok')
        setAgentHealth('ok')
        queryClient.setQueryData(queryKeys.agentHealth(), 'ok')
      } else {
        setTestPhase('error')
        setErrorDetail(result)
        setAgentHealth('error')
        queryClient.setQueryData(queryKeys.agentHealth(), 'error')
        setErrorDialogOpen(true)
      }
    },
    onError: (err) => {
      setTestPhase('error')
      setErrorDetail({ ok: false, error: String(err) })
      setAgentHealth('error')
      queryClient.setQueryData(queryKeys.agentHealth(), 'error')
      setErrorDialogOpen(true)
    },
  })

  const { mutate: saveConfig, isPending: saving } = useMutation({
    mutationFn: (body: AgentConfigInput) => api.agentConfig.save(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentConfig() })
      setFormDirty(false)
      setTestPhase('testing')
      setAgentHealth(null)
      runTest()
    },
  })

  const { mutate: deleteConfig } = useMutation({
    mutationFn: api.agentConfig.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentConfig() })
      setProvider('openai')
      setModel('')
      setApiKey('')
      setBaseUrl('')
      setFormDirty(false)
      setTestPhase('idle')
      setAgentHealth(null)
      queryClient.setQueryData(queryKeys.agentHealth(), null)
    },
  })

  const { mutate: saveGithubConfig, isPending: savingGithub } = useMutation({
    mutationFn: (token: string) => api.githubConfig.save(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() })
      setGithubToken('')
      setGithubTestStatus('testing')
      testGithubConfig()
    },
  })

  const { mutate: deleteGithubConfig, isPending: deletingGithub } = useMutation({
    mutationFn: api.githubConfig.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() })
      setGithubTestStatus('idle')
      setGithubTestMsg(null)
    },
  })

  const { mutate: setGithubAutoSync, isPending: togglingGithubAutoSync } = useMutation({
    mutationFn: (enabled: boolean) => api.githubConfig.setAutoSync(enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.githubConfig() })
    },
  })

  const { mutate: testGithubConfig, isPending: testingGithub } = useMutation({
    mutationFn: api.githubConfig.test,
    onSuccess: (result) => {
      if (result.ok) {
        setGithubTestStatus('ok')
        setGithubTestMsg(result.login ? `@${result.login}` : t('settings.testOk'))
      } else {
        setGithubTestStatus('error')
        setGithubTestMsg(result.error ?? t('settings.testFailed'))
      }
    },
    onError: (err) => {
      setGithubTestStatus('error')
      setGithubTestMsg(String(err))
    },
  })

  function handleProviderChange(p: AgentProvider) {
    setProvider(p)
    const defaults = PROVIDER_DEFAULTS[p]
    setModel(defaults.model)
    setBaseUrl(defaults.base_url ?? '')
    setFormDirty(true)
    setTestPhase('idle')
  }

  function handleSave() {
    const effectiveModel = model.trim() || PROVIDER_DEFAULTS[provider].model
    saveConfig({
      provider,
      model: effectiveModel,
      api_key: apiKey.trim(),
      base_url: baseUrl.trim() || undefined,
    })
  }

  function changeLang(code: string) {
    i18n.changeLanguage(code)
    localStorage.setItem('soloos-lang', code)
  }

  const hasApiKey = !!apiKey.trim()
  const isBusy = saving || testPhase === 'testing'

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">

      {/* Agent config */}
      <section className="rounded-xl p-5 flex flex-col gap-4"
               style={{ background: '#111', border: '1px solid #1e1e22' }}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest block mb-0.5"
                style={{ color: '#52525b' }}>
            {t('settings.agentConfig')}
          </span>
          <p className="text-xs mt-1" style={{ color: '#71717a' }}>
            {t('settings.agentConfigDesc')}
          </p>
        </div>

        {config && testPhase === 'idle' && (
          <div className="text-xs font-mono px-3 py-2 rounded-lg" style={{ background: '#18181b', color: '#10b981', border: '1px solid #10b98130' }}>
            {t('settings.configuredAs', { provider: config.provider, model: config.model })}
            <span className="ml-2" style={{ color: '#3f3f46' }}>{config.api_key_masked}</span>
          </div>
        )}

        {/* Provider select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{t('settings.provider')}</label>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: provider === p ? '#18181b' : 'transparent',
                  border: `1px solid ${provider === p ? '#6366f1' : '#27272a'}`,
                  color: provider === p ? '#e4e4e7' : '#71717a',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{t('settings.model')}</label>
          <input
            type="text"
            value={model}
            onChange={e => { setModel(e.target.value); setFormDirty(true) }}
            placeholder={PROVIDER_DEFAULTS[provider].model}
            className="rounded-lg px-3 py-2 text-sm font-mono"
            style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }}
          />
        </div>

        {/* API key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{t('settings.apiKey')}</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setFormDirty(true) }}
            placeholder={t('settings.apiKeyPlaceholder')}
            className="rounded-lg px-3 py-2 text-sm font-mono"
            style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }}
          />
        </div>

        {/* Base URL (optional) */}
        {(provider === 'ollama' || provider === 'custom') && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{t('settings.baseUrl')}</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => { setBaseUrl(e.target.value); setFormDirty(true) }}
              placeholder={t('settings.baseUrlPlaceholder')}
              className="rounded-lg px-3 py-2 text-sm font-mono"
              style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }}
            />
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasApiKey || isBusy}
            className="flex-shrink-0 gap-1.5"
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> {t('settings.saving')}</> :
             testPhase === 'testing' ? <><Loader2 size={13} className="animate-spin" /> {t('settings.testing')}</> :
             testPhase === 'ok' ? <><Check size={13} /> {t('settings.testOk')}</> :
             t('settings.save')}
          </Button>
          {config && !isBusy && (
            <Button
              variant="outline"
              onClick={() => deleteConfig()}
              className="flex-shrink-0"
              style={{ borderColor: '#ef444433', color: '#ef4444' }}
            >
              {t('settings.clear')}
            </Button>
          )}
          {testPhase === 'error' && (
            <button
              onClick={() => setErrorDialogOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}
            >
              <AlertCircle size={12} />
              {t('settings.testFailed')} — {t('settings.viewDetails')}
            </button>
          )}
        </div>
      </section>

      {/* GitHub config */}
      <section className="rounded-xl p-5 flex flex-col gap-4"
               style={{ background: '#111', border: '1px solid #1e1e22' }}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest block mb-0.5"
                style={{ color: '#52525b' }}>
            {t('settings.githubConfig')}
          </span>
          <p className="text-xs mt-1" style={{ color: '#71717a' }}>
            {t('settings.githubConfigDesc')}
          </p>
        </div>

        {githubConfig && (
          <div className="text-xs font-mono px-3 py-2 rounded-lg" style={{ background: '#18181b', color: '#10b981', border: '1px solid #10b98130' }}>
            {t('settings.savedTokenMasked', { token: githubConfig.token_masked })}
          </div>
        )}

        {githubConfig && (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: '#27272a', background: '#18181b' }}>
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: '#e4e4e7' }}>
                {t('settings.githubAutoSync')}
              </span>
              <span className="text-[11px]" style={{ color: '#71717a' }}>
                {t('settings.githubAutoSyncDesc')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setGithubAutoSync(!githubConfig.auto_sync_enabled)}
              disabled={togglingGithubAutoSync}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: githubConfig.auto_sync_enabled ? '#14532d20' : '#3f3f4620',
                border: `1px solid ${githubConfig.auto_sync_enabled ? '#4ade8033' : '#3f3f46'}`,
                color: githubConfig.auto_sync_enabled ? '#4ade80' : '#a1a1aa',
              }}
            >
              {githubConfig.auto_sync_enabled ? t('settings.enabled') : t('settings.disabled')}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{t('settings.apiKey')}</label>
          <input
            type="password"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            placeholder={t('settings.githubApiKeyPlaceholder')}
            className="rounded-lg px-3 py-2 text-sm font-mono"
            style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', outline: 'none' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => saveGithubConfig(githubToken.trim())}
            disabled={!githubToken.trim() || savingGithub}
          >
            {savingGithub ? t('settings.saving') : t('settings.save')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setGithubTestStatus('testing')
              testGithubConfig()
            }}
            disabled={!githubConfig || testingGithub}
          >
            {testingGithub ? t('settings.testing') : t('settings.testConnection')}
          </Button>
          {githubConfig && (
            <Button
              variant="outline"
              onClick={() => deleteGithubConfig()}
              disabled={deletingGithub}
              style={{ borderColor: '#ef444433', color: '#ef4444' }}
            >
              {t('settings.clear')}
            </Button>
          )}
        </div>

        {githubTestStatus !== 'idle' && githubTestMsg && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: githubTestStatus === 'ok' ? '#14532d20' : '#7f1d1d20',
              color: githubTestStatus === 'ok' ? '#4ade80' : '#fca5a5',
            }}
          >
            {githubTestMsg}
          </div>
        )}

        <div className="rounded-lg border" style={{ borderColor: '#27272a' }}>
          <div className="px-3 py-2 text-xs" style={{ color: '#71717a', borderBottom: '1px solid #27272a' }}>
            {t('settings.boundRepos')}
          </div>
          {outputBindings.length === 0 ? (
            <div className="px-3 py-3 text-xs" style={{ color: '#52525b' }}>
              {t('settings.noBoundRepos')}
            </div>
          ) : (
            <div>
              {outputBindings.map((b) => (
                <div key={b.id} className="px-3 py-2 text-xs flex items-center justify-between gap-3 border-b" style={{ borderColor: '#18181b' }}>
                  <div className="min-w-0">
                    <div className="truncate" style={{ color: '#e4e4e7' }}>{b.repo_full_name}</div>
                    <div style={{ color: '#71717a' }}>{b.project_id ?? t('output.stateLabel.DRAFT')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Button variant="outline" onClick={() => navigate('/output')}>
            {t('settings.goToOutputToEdit')}
          </Button>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-xl p-5 flex flex-col gap-4"
               style={{ background: '#111', border: '1px solid #1e1e22' }}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest block mb-0.5"
                style={{ color: '#52525b' }}>
            {t('settings.language')}
          </span>
          <p className="text-xs mt-1" style={{ color: '#71717a' }}>
            {t('settings.languageDesc')}
          </p>
        </div>

        <div className="flex gap-2">
          {LANGUAGES.map(lang => {
            const active = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? '#18181b' : 'transparent',
                  border: `1px solid ${active ? '#6366f1' : '#27272a'}`,
                  color: active ? '#e4e4e7' : '#71717a',
                }}
              >
                {lang.label}
                {active && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle"
                        style={{ background: '#6366f1' }} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Error detail dialog */}
      {errorDetail && (
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent
            className="sm:max-w-2xl"
            style={{ background: '#111', border: '1px solid #1e1e22' }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: '#ef4444' }}>
                <AlertCircle size={14} />
                {t('settings.testFailedTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-xs overflow-hidden">
              {errorDetail.url && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
                    {t('settings.errorUrl')}
                  </span>
                  <code className="px-2 py-1.5 rounded break-all" style={{ background: '#18181b', color: '#a1a1aa' }}>
                    {errorDetail.url.replace(/key=[^&]+/, 'key=***')}
                  </code>
                </div>
              )}
              {errorDetail.request_body && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
                    {t('settings.errorRequest')}
                  </span>
                  <pre className="px-2 py-1.5 rounded overflow-x-auto text-xs" style={{ background: '#18181b', color: '#a1a1aa', maxHeight: 120 }}>
                    {(() => {
                      try { return JSON.stringify(JSON.parse(errorDetail.request_body!), null, 2) }
                      catch { return errorDetail.request_body }
                    })()}
                  </pre>
                </div>
              )}
              {errorDetail.response_status !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
                    {t('settings.errorResponse')} (HTTP {errorDetail.response_status})
                  </span>
                  <pre className="px-2 py-1.5 rounded overflow-x-auto text-xs" style={{ background: '#18181b', color: '#ef4444', maxHeight: 200 }}>
                    {(() => {
                      try { return JSON.stringify(JSON.parse(errorDetail.response_body ?? ''), null, 2) }
                      catch { return errorDetail.response_body }
                    })()}
                  </pre>
                </div>
              )}
              {errorDetail.error && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
                    {t('settings.errorMessage')}
                  </span>
                  <code className="px-2 py-1.5 rounded" style={{ background: '#18181b', color: '#ef4444' }}>
                    {errorDetail.error}
                  </code>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
