import { useEffect, useState } from 'react'
import { api, type PlaySession, type Settings, type VrAccount } from './api'

export type OverlayMode = 'vr' | 'mmr' | 'auto'

function resolveDisplay(
  mode: OverlayMode,
  activeSessions: PlaySession[],
  idleAutoDisplay: 'vr' | 'mmr',
): 'vr' | 'mmr' {
  if (mode !== 'auto') return mode
  if (activeSessions.some(s => s.source === 'lounge' && s.status === 'active')) return 'mmr'
  if (activeSessions.some(s => s.source === 'ranked' && s.status === 'active')) return 'vr'
  return idleAutoDisplay
}

function getMmr(settings: Settings | null): { value: number | null; label: '12p' | '24p' } {
  if (!settings) return { value: null, label: '12p' }
  if (settings.lounge_game === 'mkworld24p') return { value: settings.lounge_mmr_24p, label: '24p' }
  return { value: settings.lounge_mmr_12p, label: '12p' }
}

function fmtHms(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  initialMode: OverlayMode
  compact: boolean
  solidBg: boolean
}

export default function RateOverlayView({ initialMode, compact, solidBg }: Props) {
  const [mode, setMode] = useState<OverlayMode>(initialMode)
  const [vrAccounts, setVrAccounts] = useState<VrAccount[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [activeSessions, setActiveSessions] = useState<PlaySession[]>([])
  const [stale, setStale] = useState(false)
  const [lastOk, setLastOk] = useState<string | null>(null)
  const [idleAutoDisplay, setIdleAutoDisplay] = useState<'vr' | 'mmr'>('vr')

  useEffect(() => {
    document.body.classList.add('overlay-mode')
    return () => document.body.classList.remove('overlay-mode')
  }, [])

  useEffect(() => {
    let active = true
    const poll = async () => {
      if (!active) return
      try {
        const [accounts, s] = await Promise.all([api.getVrAccounts(), api.getSettings()])
        if (!active) return
        setVrAccounts(accounts)
        setSettings(s)
        if (mode === 'auto') {
          const sessions = await api.getActiveSessions()
          if (!active) return
          setActiveSessions(sessions)
        }
        setStale(false)
        setLastOk(new Date().toISOString())
      } catch {
        if (active) setStale(true)
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [mode])

  const hasLoungeSession = activeSessions.some(s => s.source === 'lounge' && s.status === 'active')
  const hasRankedSession = activeSessions.some(s => s.source === 'ranked' && s.status === 'active')

  useEffect(() => {
    if (mode !== 'auto' || hasLoungeSession || hasRankedSession) {
      setIdleAutoDisplay('vr')
      return
    }
    const id = setInterval(() => {
      setIdleAutoDisplay(d => (d === 'vr' ? 'mmr' : 'vr'))
    }, 8000)
    return () => clearInterval(id)
  }, [mode, hasLoungeSession, hasRankedSession])

  const activeAccount = vrAccounts.find(a => a.is_active) ?? null
  const display = resolveDisplay(mode, activeSessions, idleAutoDisplay)
  const mmr = getMmr(settings)
  const displayLabel = display === 'vr' ? 'VR' : 'MMR'
  const displayValue = display === 'vr'
    ? (activeAccount ? activeAccount.current_vr.toLocaleString() : '--')
    : (mmr.value !== null ? mmr.value.toLocaleString() : '--')
  const displayMeta = display === 'vr'
    ? activeAccount?.display_name
    : `Lounge ${mmr.label}`

  return (
    <div className={`overlay${compact ? ' overlay--compact' : ''}${solidBg ? ' overlay--solid' : ''}`}>
      {!compact && (
        <div className="overlay__mode-switch">
          {(['vr', 'mmr', 'auto'] as const).map(m => (
            <button
              key={m}
              className={`overlay__mode-btn${mode === m ? ' overlay__mode-btn--on' : ''}`}
              onClick={() => setMode(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="overlay__body">
        <div className={`overlay__line${displayValue === '--' ? ' overlay__line--empty' : ''}`}>
          <span className="overlay__line-label">{displayLabel}</span>
          <span className="overlay__line-value">{displayValue}</span>
        </div>
        {!compact && (
          <div className="overlay__meta">
            {displayMeta}
            {stale ? ' / 接続なし' : lastOk ? ` / Updated ${fmtHms(lastOk)}` : null}
          </div>
        )}
      </div>
    </div>
  )
}
