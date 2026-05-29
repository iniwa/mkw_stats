import { useEffect, useState } from 'react'
import { api, ApiError, Course, MmrSyncResponse, PlaySession, RaceRecord, Route } from './api'

interface LoungeData {
  sessions: PlaySession[]
  racesBySession: Map<string, RaceRecord[]>
  courses: Course[]
  routes: Route[]
}

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

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function buildTrendPoints(sessions: PlaySession[], game: string): PlaySession[] {
  return sessions
    .filter(s => s.lounge_mmr_after != null && s.lounge_mmr_game === game)
    .sort((a, b) => {
      const ta = a.completed_at ?? a.started_at
      const tb = b.completed_at ?? b.started_at
      return ta < tb ? -1 : ta > tb ? 1 : 0
    })
    .slice(-MMR_TREND_LIMIT)
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
  const allTimes: number[] = [
    ...trend12.map(s => new Date(s.completed_at ?? s.started_at).getTime()),
    ...trend24.map(s => new Date(s.completed_at ?? s.started_at).getTime()),
  ]

  const vMin = Math.min(...allVals)
  const vMax = Math.max(...allVals)
  const tMin = Math.min(...allTimes)
  const tMax = Math.max(...allTimes)
  const vRange = vMax === vMin ? 1 : vMax - vMin
  const tRange = tMax === tMin ? 1 : tMax - tMin

  const tx = (iso: string): number =>
    padL + ((new Date(iso).getTime() - tMin) / tRange) * chartW
  const ty = (v: number): number =>
    padT + (1 - (v - vMin) / vRange) * chartH
  const toPoints = (pts: PlaySession[]): string =>
    pts.map(s => `${tx(s.completed_at ?? s.started_at)},${ty(s.lounge_mmr_after!)}`).join(' ')

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
        <circle key={i} cx={tx(s.completed_at ?? s.started_at)} cy={ty(s.lounge_mmr_after!)} r={3} fill={c12} />
      ))}
      {trend24.map((s, i) => (
        <circle key={i} cx={tx(s.completed_at ?? s.started_at)} cy={ty(s.lounge_mmr_after!)} r={3} fill={c24} />
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

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sessions, courses, routes] = await Promise.all([
        api.getSessions({
          source: 'lounge',
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
        }),
        api.getCourses(),
        api.getRoutes(),
      ])
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      const racesBySession = new Map<string, RaceRecord[]>()
      sessions.forEach((s, i) => racesBySession.set(s.id, raceArrays[i]))
      setData({ sessions, racesBySession, courses, routes })
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
      if (result.updated_session) {
        await load()
      }
    } catch (e: unknown) {
      setMmrSyncError(e instanceof ApiError ? e.message : 'MMR同期に失敗しました')
    } finally {
      setMmrSyncing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [dateFrom, dateTo, limit])

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

  const { sessions, racesBySession, courses, routes } = data

  const trend12 = buildTrendPoints(sessions, 'mkworld')
  const trend24 = buildTrendPoints(sessions, 'mkworld24p')
  const hasTrend = trend12.length > 0 || trend24.length > 0
  const syncedAll = sessions
    .filter(s =>
      s.lounge_mmr_after != null
      && (s.lounge_mmr_game === 'mkworld' || s.lounge_mmr_game === 'mkworld24p')
    )
    .sort((a, b) => {
      const ta = a.completed_at ?? a.started_at
      const tb = b.completed_at ?? b.started_at
      return ta > tb ? -1 : ta < tb ? 1 : 0
    })
    .slice(0, 6)

  const windowLabel = (dateFrom || dateTo) ? 'Filtered sessions' : `Recent ${limit} Lounge sessions`

  if (sessions.length === 0) {
    return (
      <div className="lounge">
        <div className="lounge__header">
          <span className="lounge__title">Lounge</span>
          <span className="lounge__window">{windowLabel}</span>
          <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
        </div>
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
          <button className="btn" disabled={loading || (!dateFrom && !dateTo)}
            onClick={() => { setDateFrom(''); setDateTo('') }}>日付クリア</button>
        </div>
        <p className="placeholder">Lounge セッションがありません。</p>
      </div>
    )
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const recentSessions = sessions.slice(0, 10)

  // Lounge summary metrics
  const allRacesFlat = [...racesBySession.values()].flat()
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
        <button className="btn" disabled={loading || (!dateFrom && !dateTo)}
          onClick={() => { setDateFrom(''); setDateTo('') }}>日付クリア</button>
      </div>

      <div className="panel">
        <div className="panel__title">Lounge サマリー</div>
        <div className="analytics__grid analytics__grid--4">
          {([
            ['セッション', sessions.length],
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

      <div className="panel">
        <div className="panel__title">MMR</div>
        {(() => {
          const synced = sessions.filter(s => s.lounge_mmr_after != null)
          const synced12 = sessions.filter(s => s.lounge_mmr_game === 'mkworld' && s.lounge_mmr_after != null)
          const synced24 = sessions.filter(s => s.lounge_mmr_game === 'mkworld24p' && s.lounge_mmr_after != null)
          const latest = synced[0]

          const mmr12 = mmrSyncResult != null
            ? mmrSyncResult.current_mmr_12p
            : (synced12[0]?.lounge_mmr_after ?? null)
          const mmr24 = mmrSyncResult != null
            ? mmrSyncResult.current_mmr_24p
            : (synced24[0]?.lounge_mmr_after ?? null)

          const hasAnyMmr = mmr12 != null || mmr24 != null || synced.length > 0
          return (
            <>
              {hasAnyMmr ? (
                <div className="analytics__grid analytics__grid--4">
                  {([
                    ['12p MMR', mmr12 ?? '—'],
                    ['24p MMR', mmr24 ?? '—'],
                    ['前回変動', latest?.lounge_mmr_delta != null ? (latest.lounge_mmr_delta >= 0 ? `+${latest.lounge_mmr_delta}` : String(latest.lounge_mmr_delta)) : '—'],
                    ['同期済み', synced.length],
                  ] as [string, string | number][]).map(([label, value]) => (
                    <div key={label} className="analytics__metric">
                      <div className="analytics__metric-value">{value}</div>
                      <div className="analytics__metric-label">{label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="placeholder">未連携 — 下のボタンで Lounge MMR を同期できます</p>
              )}
              <div className="btn-row">
                <button className="btn btn--primary" onClick={syncMmr} disabled={mmrSyncing || loading}>
                  {mmrSyncing ? '同期中…' : 'MMR同期'}
                </button>
              </div>
              {mmrSyncResult && (
                <p className="lounge__mmr-msg">
                  {mmrSyncResult.updated_game && `[${mmrSyncResult.updated_game}] `}
                  {mmrSyncResult.message}
                </p>
              )}
              {mmrSyncError && <p className="notice notice--error">{mmrSyncError}</p>}
            </>
          )
        })()}
      </div>

      <div className="panel">
        <div className="panel__title">MMR 推移</div>
        {!hasTrend ? (
          <p className="placeholder">同期済みのMMR履歴がありません</p>
        ) : (
          <>
            <MmrTrendChart trend12={trend12} trend24={trend24} />
            <div className="lounge__section-label" style={{ marginTop: '0.6rem' }}>直近の同期履歴</div>
            <ul className="lounge__mmr-list">
              {syncedAll.map(s => {
                const is24 = s.lounge_mmr_game === 'mkworld24p'
                const delta = s.lounge_mmr_delta
                const deltaStr = delta != null ? (delta >= 0 ? `+${delta}` : String(delta)) : '—'
                const deltaPos = delta != null && delta >= 0
                return (
                  <li key={s.id} className="lounge__mmr-item">
                    <span className="lounge__meta">{fmtTime(s.completed_at ?? s.started_at)}</span>
                    <span className={`tag ${is24 ? 'tag--mmr24' : 'tag--mmr12'}`}>{is24 ? '24p' : '12p'}</span>
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
          </>
        )}
      </div>

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
