import { useEffect, useState } from 'react'
import { fmtTime, fmtValue } from './format'
import { api, ApiError, Course, MmrSyncResponse, PlaySession, RaceRecord, Route, Settings } from './api'

interface LoungeData {
  sessions: PlaySession[]
  racesBySession: Map<string, RaceRecord[]>
  courses: Course[]
  routes: Route[]
  settings: Settings | null
}

type LoungeSeasonSelection = 'all' | 'current' | 'legacy' | `season:${number}`

const LEGACY_SEASON_BOUNDARY = 3

function resolveName(
  kind: 'course' | 'route',
  id: string,
  courses: Course[],
  routes: Route[],
): string {
  if (kind === 'course') {
    const c = courses.find(c => c.id === id)
    return c ? (c.short_name ?? c.name_ja) : id
  }
  const r = routes.find(r => r.id === id)
  return r ? (r.short_name ?? r.name_ja ?? id) : id
}

function toFromISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toISOString()
}

function toToISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day + 1).toISOString()
}

const MMR_TREND_LIMIT = 20

// Classify a synced session's MKCentral game string into a player-count bucket.
// Season 2+: mkworld12p / mkworld24p. Season 0/1 legacy: combined "mkworld" → treated as 12p.
function mmrGameKind(game: string | null): '12p' | '24p' | null {
  if (game === 'mkworld24p') return '24p'
  if (game === 'mkworld12p' || game === 'mkworld') return '12p'
  return null
}

function buildTrendPoints(sessions: PlaySession[], kind: '12p' | '24p'): PlaySession[] {
  return sessions
    .filter(s => s.lounge_mmr_after != null && mmrGameKind(s.lounge_mmr_game) === kind)
    .sort((a, b) => {
      const ta = a.completed_at ?? a.started_at
      const tb = b.completed_at ?? b.started_at
      return ta < tb ? -1 : ta > tb ? 1 : 0
    })
    .slice(-MMR_TREND_LIMIT)
}

interface SeasonTrend {
  key: number | 'legacy'
  label: string
  trend12: PlaySession[]
  trend24: PlaySession[]
}

function seasonTrendLabel(key: number | 'legacy'): string {
  return key === 'legacy' ? `シーズン${LEGACY_SEASON_BOUNDARY}以前` : `シーズン${key}`
}

// Season 3 and later stay independent. Earlier and unknown rows share the fixed
// compatibility bucket so all-season views never reintroduce "シーズン不明".
function buildSeasonTrends(sessions: PlaySession[]): SeasonTrend[] {
  const synced = sessions.filter(
    s => s.lounge_mmr_after != null && mmrGameKind(s.lounge_mmr_game) != null,
  )
  const groups = new Map<number | 'legacy', PlaySession[]>()
  for (const s of synced) {
    const key: number | 'legacy' = s.lounge_season != null && s.lounge_season >= LEGACY_SEASON_BOUNDARY
      ? s.lounge_season
      : 'legacy'
    const arr = groups.get(key)
    if (arr) arr.push(s)
    else groups.set(key, [s])
  }
  const numbered = [...groups.keys()]
    .filter((k): k is number => k !== 'legacy')
    .sort((a, b) => b - a)
  const ordered: (number | 'legacy')[] = [...numbered]
  if (groups.has('legacy')) ordered.push('legacy')
  return ordered.map(key => ({
    key,
    label: seasonTrendLabel(key),
    trend12: buildTrendPoints(groups.get(key)!, '12p'),
    trend24: buildTrendPoints(groups.get(key)!, '24p'),
  }))
}

function MmrTrendChart({ trend12, trend24 }: { trend12: PlaySession[]; trend24: PlaySession[] }) {
  const W = 480, H = 130
  const padL = 46, padR = 8, padT = 10, padB = 14
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const allVals: number[] = [
    ...trend12.map(s => s.lounge_mmr_after!),
    ...trend24.map(s => s.lounge_mmr_after!),
  ]

  const vMin = Math.min(...allVals)
  const vMax = Math.max(...allVals)
  const vRange = vMax === vMin ? 1 : vMax - vMin

  const txIndex = (index: number, total: number): number => {
    if (total <= 1) return padL + chartW / 2
    return padL + (index / (total - 1)) * chartW
  }
  const ty = (v: number): number =>
    padT + (1 - (v - vMin) / vRange) * chartH
  const toPoints = (pts: PlaySession[]): string =>
    pts.map((s, i) => `${txIndex(i, pts.length)},${ty(s.lounge_mmr_after!)}`).join(' ')

  const yTicks = vMax === vMin ? [vMin] : [vMax, Math.round((vMax + vMin) / 2), vMin]
  const c12 = '#5b8bf0'
  const c24 = '#e6b24d'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={ty(v)} x2={W - padR} y2={ty(v)} stroke="#2e2e3e" strokeWidth={1} />
          <text x={padL - 4} y={ty(v) + 3.5} textAnchor="end" fontSize={10} fill="#6a6a7e">{v}</text>
        </g>
      ))}
      {trend12.length > 1 && (
        <polyline points={toPoints(trend12)} fill="none" stroke={c12} strokeWidth={2} strokeLinejoin="round" />
      )}
      {trend24.length > 1 && (
        <polyline points={toPoints(trend24)} fill="none" stroke={c24} strokeWidth={2} strokeLinejoin="round" />
      )}
      {trend12.map((s, i) => (
        <circle key={i} cx={txIndex(i, trend12.length)} cy={ty(s.lounge_mmr_after!)} r={3} fill={c12} />
      ))}
      {trend24.map((s, i) => (
        <circle key={i} cx={txIndex(i, trend24.length)} cy={ty(s.lounge_mmr_after!)} r={3} fill={c24} />
      ))}
      <circle cx={W - padR - 62} cy={padT + 5} r={4} fill={c12} />
      <text x={W - padR - 54} y={padT + 9} fontSize={10} fill="#9a9aae">12p</text>
      <circle cx={W - padR - 32} cy={padT + 5} r={4} fill={c24} />
      <text x={W - padR - 24} y={padT + 9} fontSize={10} fill="#9a9aae">24p</text>
    </svg>
  )
}

export default function LoungeView() {
  const [data, setData] = useState<LoungeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(50)
  const [mmrSyncing, setMmrSyncing] = useState(false)
  const [mmrSyncResult, setMmrSyncResult] = useState<MmrSyncResponse | null>(null)
  const [mmrSyncError, setMmrSyncError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'both' | '24p' | '12p'>('both')
  const [seasonSelection, setSeasonSelection] = useState<LoungeSeasonSelection>('current')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const settings = await api.getSettings().catch((): Settings | null => null)
      if (settings == null) {
        throw new Error('設定を読み込めないため、ラウンジシーズンを判定できません')
      }
      const selectedNumber = seasonSelection.startsWith('season:')
        ? Number(seasonSelection.slice('season:'.length))
        : null
      const loungeSeason = seasonSelection === 'current'
        ? settings.lounge_season
        : (selectedNumber ?? undefined)
      const loungeSeasonBefore = seasonSelection === 'legacy'
        ? LEGACY_SEASON_BOUNDARY
        : undefined
      const [sessions, courses, routes] = await Promise.all([
        api.getSessions({
          source: 'lounge',
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
          lounge_season: loungeSeason,
          lounge_season_before: loungeSeasonBefore,
        }),
        api.getCourses(),
        api.getRoutes(),
      ])
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      const racesBySession = new Map<string, RaceRecord[]>()
      sessions.forEach((s, i) => racesBySession.set(s.id, raceArrays[i]))
      setData({ sessions, racesBySession, courses, routes, settings })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function syncMmr() {
    setMmrSyncing(true)
    setMmrSyncError(null)
    setMmrSyncResult(null)
    try {
      const result = await api.mmrSync()
      setMmrSyncResult(result)
      // A successful sync can also enrich only a legacy session's season while
      // returning updated_session=null. Reload so season grouping updates immediately.
      await load()
    } catch (e: unknown) {
      setMmrSyncError(e instanceof ApiError ? e.message : 'MMR同期に失敗しました')
    } finally {
      setMmrSyncing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [dateFrom, dateTo, limit, seasonSelection])

  if (loading) return <p className="placeholder">読み込み中…</p>

  if (error || !data) {
    return (
      <div className="lounge">
        <p className="notice notice--error">{error ?? '読み込みに失敗しました'}</p>
        <div className="btn-row">
          <button className="btn" onClick={load}>再試行</button>
        </div>
      </div>
    )
  }

  const { sessions, racesBySession, courses, routes, settings } = data

  const currentSeason = settings?.lounge_season ?? null
  const selectedSeason = seasonSelection.startsWith('season:')
    ? Number(seasonSelection.slice('season:'.length))
    : seasonSelection === 'current'
      ? currentSeason
      : null
  const historicalSeasonOptions = currentSeason != null && currentSeason > LEGACY_SEASON_BOUNDARY
    ? Array.from(
        { length: currentSeason - LEGACY_SEASON_BOUNDARY },
        (_, index) => currentSeason - index - 1,
      )
    : []
  const seasonTrends = seasonSelection === 'legacy'
    ? [{
        key: 'unknown' as const,
        label: `シーズン${LEGACY_SEASON_BOUNDARY}以前`,
        trend12: buildTrendPoints(sessions, '12p'),
        trend24: buildTrendPoints(sessions, '24p'),
      }]
    : buildSeasonTrends(sessions)
  const syncedAll = sessions
    .filter(s => s.lounge_mmr_after != null && mmrGameKind(s.lounge_mmr_game) != null)
    .filter(s => viewMode === 'both' || mmrGameKind(s.lounge_mmr_game) === viewMode)
    .sort((a, b) => {
      const ta = a.completed_at ?? a.started_at
      const tb = b.completed_at ?? b.started_at
      return ta > tb ? -1 : ta < tb ? 1 : 0
    })
    .slice(0, 6)

  const seasonScopeLabel = seasonSelection === 'all'
    ? '全シーズン'
    : seasonSelection === 'current'
      ? `今シーズン（シーズン${currentSeason ?? '—'}）`
      : seasonSelection === 'legacy'
        ? `シーズン${LEGACY_SEASON_BOUNDARY}以前`
        : `シーズン${selectedSeason ?? '—'}`
  const windowLabel = `${dateFrom || dateTo ? 'フィルター中' : `直近 ${limit} セッション`}・${seasonScopeLabel}`

  const dateFilter = (
    <div className="date-filter">
      <div className="date-filter__group">
        <span className="date-filter__label">開始日</span>
        <input type="date" className="date-filter__input" value={dateFrom} disabled={loading}
          onChange={e => setDateFrom(e.target.value)} />
      </div>
      <div className="date-filter__group">
        <span className="date-filter__label">終了日</span>
        <input type="date" className="date-filter__input" value={dateTo} disabled={loading}
          onChange={e => setDateTo(e.target.value)} />
      </div>
      <div className="date-filter__group">
        <span className="date-filter__label">件数</span>
        <select className="date-filter__select" value={limit} disabled={loading}
          onChange={e => setLimit(Number(e.target.value))}>
          {[25, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="date-filter__group">
        <span className="date-filter__label">ラウンジシーズン</span>
        <select className="date-filter__select" value={seasonSelection} disabled={loading}
          onChange={e => setSeasonSelection(e.target.value as LoungeSeasonSelection)}>
          <option value="all">全シーズン</option>
          <option value="current">今シーズン（シーズン{currentSeason ?? '—'}）</option>
          {historicalSeasonOptions.map(season => (
            <option key={season} value={`season:${season}`}>シーズン{season}</option>
          ))}
          <option value="legacy">シーズン{LEGACY_SEASON_BOUNDARY}以前</option>
        </select>
      </div>
      <button className="btn" disabled={loading || (!dateFrom && !dateTo)}
        onClick={() => { setDateFrom(''); setDateTo('') }}>日付クリア</button>
    </div>
  )

  // Current season uses the live Settings snapshot. In all-season mode, keep this MMR
  // summary current-season-only so max/min never mix across season boundaries.
  const mmrSummarySessions = seasonSelection === 'all'
    ? sessions.filter(s => currentSeason != null && s.lounge_season === currentSeason)
    : sessions
  const synced = mmrSummarySessions.filter(s => s.lounge_mmr_after != null)
  const synced12 = mmrSummarySessions.filter(s => mmrGameKind(s.lounge_mmr_game) === '12p' && s.lounge_mmr_after != null)
  const synced24 = mmrSummarySessions.filter(s => mmrGameKind(s.lounge_mmr_game) === '24p' && s.lounge_mmr_after != null)
  const syncedForView = viewMode === '12p' ? synced12 : viewMode === '24p' ? synced24 : synced
  const latestForView = syncedForView[0]
  const summaryIsCurrentSeason = seasonSelection === 'current' || seasonSelection === 'all'
  const mmr12 = summaryIsCurrentSeason
    ? (mmrSyncResult?.current_mmr_12p ?? settings?.lounge_mmr_12p ?? synced12[0]?.lounge_mmr_after ?? null)
    : (synced12[0]?.lounge_mmr_after ?? null)
  const mmr24 = summaryIsCurrentSeason
    ? (mmrSyncResult?.current_mmr_24p ?? settings?.lounge_mmr_24p ?? synced24[0]?.lounge_mmr_after ?? null)
    : (synced24[0]?.lounge_mmr_after ?? null)
  const mmr12Values = [
    ...synced12.map(s => s.lounge_mmr_after!),
    ...(mmr12 != null ? [mmr12] : []),
  ]
  const mmr24Values = [
    ...synced24.map(s => s.lounge_mmr_after!),
    ...(mmr24 != null ? [mmr24] : []),
  ]
  const maxMmr12 = mmr12Values.length > 0 ? Math.max(...mmr12Values) : null
  const minMmr12 = mmr12Values.length > 0 ? Math.min(...mmr12Values) : null
  const maxMmr24 = mmr24Values.length > 0 ? Math.max(...mmr24Values) : null
  const minMmr24 = mmr24Values.length > 0 ? Math.min(...mmr24Values) : null
  const show12 = viewMode === 'both' || viewMode === '12p'
  const show24 = viewMode === 'both' || viewMode === '24p'
  const hasAnyMmrVisible =
    settings != null && (
      (show12 && (mmr12 != null || synced12.length > 0)) ||
      (show24 && (mmr24 != null || synced24.length > 0)) ||
      (viewMode === 'both' && synced.length > 0)
    )
  const mmrPanel = (
    <div className="panel">
      <div className="panel__title">
        {summaryIsCurrentSeason
          ? `MMR（シーズン${currentSeason ?? '—'}）`
          : seasonSelection === 'legacy'
            ? `MMR（シーズン${LEGACY_SEASON_BOUNDARY}以前）`
            : `MMR（シーズン${selectedSeason ?? '—'}）`}
      </div>
      {hasAnyMmrVisible ? (
        <>
          {show12 && (
            <>
              {viewMode === 'both' && <div className="lounge__section-label">12p</div>}
              <div className="analytics__grid analytics__grid--3">
                <div className="analytics__metric analytics__metric--current">
                  <div className="analytics__metric-value">{fmtValue(mmr12)}</div>
                  <div className="analytics__metric-label">現在</div>
                </div>
                <div className="analytics__metric">
                  <div className="analytics__metric-value">{fmtValue(maxMmr12)}</div>
                  <div className="analytics__metric-label">最大</div>
                </div>
                <div className="analytics__metric">
                  <div className="analytics__metric-value">{fmtValue(minMmr12)}</div>
                  <div className="analytics__metric-label">最小</div>
                </div>
              </div>
            </>
          )}
          {show24 && (
            <>
              {viewMode === 'both' && <div className="lounge__section-label" style={{ marginTop: '0.6rem' }}>24p</div>}
              <div className="analytics__grid analytics__grid--3">
                <div className="analytics__metric analytics__metric--current">
                  <div className="analytics__metric-value">{fmtValue(mmr24)}</div>
                  <div className="analytics__metric-label">現在</div>
                </div>
                <div className="analytics__metric">
                  <div className="analytics__metric-value">{fmtValue(maxMmr24)}</div>
                  <div className="analytics__metric-label">最大</div>
                </div>
                <div className="analytics__metric">
                  <div className="analytics__metric-value">{fmtValue(minMmr24)}</div>
                  <div className="analytics__metric-label">最小</div>
                </div>
              </div>
            </>
          )}
          <div className="analytics__vr-row" style={{ marginTop: '0.5rem' }}>
            <span className="analytics__vr-label">前回変動</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {latestForView?.lounge_mmr_delta != null ? (latestForView.lounge_mmr_delta >= 0 ? `+${latestForView.lounge_mmr_delta}` : String(latestForView.lounge_mmr_delta)) : '—'}
            </span>
            <span className="analytics__vr-label" style={{ marginLeft: '0.75rem' }}>同期済み</span>
            <span>{syncedForView.length}</span>
          </div>
        </>
      ) : (
        <p className="placeholder">
          {settings == null
            ? '設定を読み込めませんでした — シーズン別 MMR を表示できません'
            : summaryIsCurrentSeason
              ? '未連携 — 下のボタンで Lounge MMR を同期できます'
              : 'このシーズンのMMR履歴がありません'}
        </p>
      )}
      {summaryIsCurrentSeason && (
        <div className="btn-row">
          <button className="btn btn--primary" onClick={syncMmr} disabled={mmrSyncing || loading}>
            {mmrSyncing ? '同期中…' : 'MMR同期'}
          </button>
        </div>
      )}
      {mmrSyncResult && (
        <p className="lounge__mmr-msg">
          {mmrSyncResult.updated_game && `[${mmrSyncResult.updated_game}] `}
          {mmrSyncResult.message}
        </p>
      )}
      {mmrSyncError && <p className="notice notice--error">{mmrSyncError}</p>}
    </div>
  )

  const viewToggle = (
    <div className="seg" style={{ marginBottom: '0.75rem' }}>
      {(['both', '24p', '12p'] as const).map(m => (
        <button
          key={m}
          className={`seg__btn${viewMode === m ? ' seg__btn--on' : ''}`}
          onClick={() => setViewMode(m)}
        >
          {m === 'both' ? '共通' : m === '24p' ? '24人' : '12人'}
        </button>
      ))}
    </div>
  )

  if (sessions.length === 0) {
    return (
      <div className="lounge">
        <div className="lounge__header">
          <span className="lounge__title">Lounge</span>
          <span className="lounge__window">{windowLabel}</span>
          <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
        </div>
        {dateFilter}
        {viewToggle}
        {mmrPanel}
        <p className="placeholder">Lounge セッションがありません。</p>
      </div>
    )
  }

  // Classify a session row (which may lack synced MMR) by player_count.
  // player_count >= 13 → 24p, <= 12 → 12p, null → shown only in 'both'
  function sessionRowKind(s: PlaySession): '12p' | '24p' | null {
    if (s.player_count == null) return null
    return s.player_count >= 13 ? '24p' : '12p'
  }

  function matchesViewMode(kind: '12p' | '24p' | null): boolean {
    if (viewMode === 'both') return true
    return kind === viewMode
  }

  const activeSessions = sessions
    .filter(s => s.status === 'active')
    .filter(s => matchesViewMode(sessionRowKind(s)))
  const recentSessions = sessions
    .slice(0, 10)
    .filter(s => matchesViewMode(sessionRowKind(s)))

  // Lounge summary metrics
  const summarySessions = sessions.filter(s => matchesViewMode(sessionRowKind(s)))
  const allRacesFlat = summarySessions.flatMap(s => racesBySession.get(s.id) ?? [])
  const completedLounge = allRacesFlat.filter(r => r.status === 'completed')
  const placementRaces = completedLounge.filter(r => r.placement != null)
  const avgPlacement = placementRaces.length > 0
    ? placementRaces.reduce((s, r) => s + r.placement!, 0) / placementRaces.length
    : null
  const scoreRaces = completedLounge.filter(r => r.score != null)
  const avgScore = scoreRaces.length > 0
    ? scoreRaces.reduce((s, r) => s + r.score!, 0) / scoreRaces.length
    : null

  const statusLabel = (s: PlaySession) =>
    s.status === 'active' ? '進行中' : s.status === 'completed' ? '完了' : '中止'

  return (
    <div className="lounge">
      <div className="lounge__header">
        <span className="lounge__title">Lounge</span>
        <span className="lounge__window">{windowLabel}</span>
        <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
      </div>

      {dateFilter}

      {viewToggle}

      <div className="panel">
        <div className="panel__title">Lounge サマリー</div>
        <div className="analytics__grid analytics__grid--4">
          {([
            ['セッション', summarySessions.length],
            ['完了レース', completedLounge.length],
            ['平均順位', avgPlacement != null ? avgPlacement.toFixed(1) : '—'],
            ['平均スコア', avgScore != null ? Math.round(avgScore).toString() : '—'],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {mmrPanel}

      {(() => {
        // One MMR trend panel per season; seasons are never combined into a single
        // chart and lines never connect across season boundaries. Empty groups
        // (no points for the active 12p/24p view) are skipped.
        const panels = seasonTrends.flatMap(st => {
          const t12 = show12 ? st.trend12 : []
          const t24 = show24 ? st.trend24 : []
          if (t12.length === 0 && t24.length === 0) return []
          return [(
            <div className="panel" key={`trend-${st.key}`}>
              <div className="panel__title">{st.label} MMR推移</div>
              <MmrTrendChart trend12={t12} trend24={t24} />
            </div>
          )]
        })
        if (panels.length === 0) {
          return (
            <div className="panel">
              <div className="panel__title">MMR推移</div>
              <p className="placeholder">同期済みのMMR履歴がありません</p>
            </div>
          )
        }
        return panels
      })()}

      {syncedAll.length > 0 && (
        <div className="panel">
          <div className="panel__title">直近の同期履歴</div>
          <ul className="lounge__mmr-list">
            {syncedAll.map(s => {
              const is24 = s.lounge_mmr_game === 'mkworld24p'
              const delta = s.lounge_mmr_delta
              const deltaStr = delta != null ? (delta >= 0 ? `+${delta}` : String(delta)) : '—'
              const deltaPos = delta != null && delta >= 0
              const seasonTag = s.lounge_season == null
                ? (seasonSelection === 'legacy' ? `S${LEGACY_SEASON_BOUNDARY}以前` : '不明')
                : `S${s.lounge_season}`
              return (
                <li key={s.id} className="lounge__mmr-item">
                  <span className="lounge__meta">{fmtTime(s.completed_at ?? s.started_at)}</span>
                  <span className={`tag ${is24 ? 'tag--mmr24' : 'tag--mmr12'}`}>{is24 ? '24p' : '12p'}</span>
                  <span className="lounge__meta">{seasonTag}</span>
                  <span className="lounge__mmr-range">
                    {s.lounge_mmr_before ?? '?'} → {s.lounge_mmr_after ?? '?'}
                  </span>
                  <span className={deltaPos ? 'lounge__mmr-delta--pos' : 'lounge__mmr-delta--neg'}>
                    {deltaStr}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {activeSessions.length > 0 && (
        <div className="panel">
          <div className="panel__title">進行中の Lounge セッション</div>
          <ul className="lounge__list">
            {activeSessions.map(s => {
              const races = racesBySession.get(s.id) ?? []
              const completedCount = races.filter(r => r.status === 'completed').length
              const cancelledCount = races.filter(r => r.status === 'cancelled').length
              const warnCount = races.reduce((n, r) => n + (r.warning_flags?.length ?? 0), 0)
              const latestRace = [...races]
                .reverse()
                .find(r => r.status !== 'cancelled' && (r.course_id || r.route_id))
              const latestName = latestRace
                ? resolveName(
                    latestRace.course_id ? 'course' : 'route',
                    latestRace.course_id ?? latestRace.route_id!,
                    courses,
                    routes,
                  )
                : null
              return (
                <li key={s.id} className="lounge__row">
                  <div className="lounge__row-top">
                    <span className="tag tag--status-active">進行中</span>
                    {s.player_count != null && (
                      <span className="lounge__meta">{s.player_count}人</span>
                    )}
                    {s.format && <span className="lounge__meta">{s.format}</span>}
                    <span className="lounge__meta">{fmtTime(s.started_at)}</span>
                  </div>
                  <div className="lounge__row-detail">
                    <span className="lounge__progress">{completedCount} / 12</span>
                    <span className="lounge__meta">合計 {races.length} レース</span>
                    {cancelledCount > 0 && (
                      <span className="lounge__meta">取消 {cancelledCount}</span>
                    )}
                    {warnCount > 0 && (
                      <span className="lounge__warn-badge">⚠ {warnCount}</span>
                    )}
                    {latestName && (
                      <span className="lounge__latest">最終: {latestName}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="panel">
        <div className="panel__title">直近の Lounge セッション</div>
        <ul className="lounge__list">
          {recentSessions.map(s => {
            const races = racesBySession.get(s.id) ?? []
            const completedCount = races.filter(r => r.status === 'completed').length
            const cancelledCount = races.filter(r => r.status === 'cancelled').length
            const warnCount = races.reduce((n, r) => n + (r.warning_flags?.length ?? 0), 0)
            const previewRaces = races.filter(
              r => r.status !== 'cancelled' && (r.course_id || r.route_id),
            )
            const preview = previewRaces
              .slice(0, 3)
              .map(r =>
                resolveName(
                  r.course_id ? 'course' : 'route',
                  r.course_id ?? r.route_id!,
                  courses,
                  routes,
                ),
              )
            return (
              <li key={s.id} className="lounge__row">
                <div className="lounge__row-top">
                  <span className={`tag tag--status-${s.status}`}>{statusLabel(s)}</span>
                  {s.player_count != null && (
                    <span className="lounge__meta">{s.player_count}人</span>
                  )}
                  {s.format && <span className="lounge__meta">{s.format}</span>}
                  <span className="lounge__meta">{fmtTime(s.started_at)}</span>
                  {s.completed_at && (
                    <span className="lounge__meta">→ {fmtTime(s.completed_at)}</span>
                  )}
                </div>
                <div className="lounge__row-detail">
                  <span className="lounge__meta">完了 {completedCount}</span>
                  {cancelledCount > 0 && (
                    <span className="lounge__meta">取消 {cancelledCount}</span>
                  )}
                  {warnCount > 0 && (
                    <span className="lounge__warn-badge">⚠ {warnCount}</span>
                  )}
                  {preview.length > 0 && (
                    <span className="lounge__preview">
                      {preview.join('、')}
                      {previewRaces.length > 3 ? '…' : ''}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

    </div>
  )
}
