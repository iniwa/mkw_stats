import { useEffect, useState } from 'react'
import { api, type PlaySession, type Settings, type VrAccount } from './api'

export type OverlayMode = 'vr' | 'mmr' | 'auto' | 'mmr12' | 'mmr24'

function resolveDisplay(
  mode: OverlayMode,
  activeSessions: PlaySession[],
  idleAutoDisplay: 'vr' | 'mmr',
): 'vr' | 'mmr' {
  if (mode === 'auto') {
    if (activeSessions.some(s => s.source === 'lounge' && s.status === 'active')) return 'mmr'
    if (activeSessions.some(s => s.source === 'ranked' && s.status === 'active')) return 'vr'
    return idleAutoDisplay
  }
  if (mode === 'vr') return 'vr'
  return 'mmr'
}

/** Resolve which MMR format to show based on mode + active lounge session. */
function resolveMmrFormat(
  mode: OverlayMode,
  activeSessions: PlaySession[],
  settings: Settings | null,
): '12p' | '24p' {
  if (mode === 'mmr12') return '12p'
  if (mode === 'mmr24') return '24p'
  // For 'mmr' and 'auto': prefer active lounge session player_count, fall back to settings
  const loungeSession = activeSessions.find(s => s.source === 'lounge' && s.status === 'active')
  if (loungeSession && loungeSession.player_count !== null) {
    return loungeSession.player_count >= 13 ? '24p' : '12p'
  }
  if (settings?.lounge_game === 'mkworld24p') return '24p'
  return '12p'
}

function getMmr(settings: Settings | null, format: '12p' | '24p'): { value: number | null; label: '12p' | '24p' } {
  if (!settings) return { value: null, label: format }
  if (format === '24p') return { value: settings.lounge_mmr_24p, label: '24p' }
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
        if (mode !== 'vr') {
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
  const mmrFormat = resolveMmrFormat(mode, activeSessions, settings)
  const mmr = getMmr(settings, mmrFormat)
  const displayLabel = display === 'vr' ? 'VR' : `${mmr.label}MMR`
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
          {(['vr', 'mmr', 'mmr12', 'mmr24', 'auto'] as const).map(m => (
            <button
              key={m}
              className={`overlay__mode-btn${mode === m ? ' overlay__mode-btn--on' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'vr' ? 'VR' : m === 'mmr' ? 'MMR' : m === 'mmr12' ? '12p' : m === 'mmr24' ? '24p' : 'AUTO'}
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
