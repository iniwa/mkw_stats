import { useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, Route, Settings, VrAccount } from './api'

interface AnalyticsData {
  sessions: PlaySession[]
  allRaces: RaceRecord[]
  courses: Course[]
  routes: Route[]
  settings: Settings | null
  vrAccounts: VrAccount[]
}

interface TargetAccum {
  kind: 'course' | 'route'
  id: string
  count: number
  completedCount: number
  placementSum: number
  placementCount: number
  vrDeltaSum: number
  vrDeltaCount: number
}

function resolveName(kind: 'course' | 'route', id: string, courses: Course[], routes: Route[]): string {
  if (kind === 'course') {
    const c = courses.find(c => c.id === id)
    return c ? (c.short_name ?? c.name_ja) : id
  }
  const r = routes.find(r => r.id === id)
  return r ? (r.short_name ?? r.name_ja ?? id) : id
}

function fmtDelta(v: number | null): string {
  if (v == null) return '—'
  return v >= 0 ? `+${v}` : String(v)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

function VrTrendChart({ races }: { races: RaceRecord[] }) {
  const W = 480, H = 130
  const padL = 46, padR = 8, padT = 10, padB = 14
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const vals = races.map(r => r.rating_after!)
  const vMin = Math.min(...vals)
  const vMax = Math.max(...vals)
  const isFlatLine = vMax === vMin

  const n = races.length
  const tx = (i: number) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
  const ty = (v: number) => isFlatLine
    ? padT + chartH / 2
    : padT + (1 - (v - vMin) / (vMax - vMin)) * chartH

  const points = vals.map((v, i) => `${tx(i)},${ty(v)}`).join(' ')
  const yTicks = isFlatLine ? [vMin] : [vMax, Math.round((vMax + vMin) / 2), vMin]
  const color = '#5b8bf0'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={ty(v)} x2={W - padR} y2={ty(v)} stroke="#2e2e3e" strokeWidth={1} />
          <text x={padL - 4} y={ty(v) + 3.5} textAnchor="end" fontSize={10} fill="#6a6a7e">{v}</text>
        </g>
      ))}
      {n > 1 && (
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      )}
      {vals.map((v, i) => (
        <circle key={i} cx={tx(i)} cy={ty(v)} r={3} fill={color} />
      ))}
    </svg>
  )
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(50)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sessions, courses, routes, settings, vrAccounts] = await Promise.all([
        api.getSessions({
          source: 'ranked',
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
        }),
        api.getCourses(),
        api.getRoutes(),
        api.getSettings().catch((): Settings | null => null),
        api.getVrAccounts().catch((): VrAccount[] => []),
      ])
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      setData({ sessions, allRaces: raceArrays.flat(), courses, routes, settings, vrAccounts })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [dateFrom, dateTo, limit])

  if (loading) return <p className="placeholder">読み込み中…</p>

  if (error || !data) {
    return (
      <div className="analytics">
        <p className="notice notice--error">{error ?? '読み込みに失敗しました'}</p>
        <div className="btn-row">
          <button className="btn" onClick={load}>再試行</button>
        </div>
      </div>
    )
  }

  const { sessions, allRaces, courses, routes, settings, vrAccounts } = data
  const windowLabel = (dateFrom || dateTo) ? 'フィルター中' : `直近 ${limit} セッション`
  const activeAccount = vrAccounts.find(a => a.id === settings?.selected_vr_account_id)
    ?? vrAccounts.find(a => a.is_active)

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
      <button className="btn" disabled={loading || (!dateFrom && !dateTo)}
        onClick={() => { setDateFrom(''); setDateTo('') }}>日付クリア</button>
    </div>
  )

  if (sessions.length === 0) {
    return (
      <div className="analytics">
        <div className="analytics__header">
          <span className="analytics__title">VR Analytics</span>
          <span className="analytics__window">{windowLabel}</span>
          <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
        </div>
        {dateFilter}
        <p className="placeholder">Ranked セッションがありません。</p>
      </div>
    )
  }

  const effectiveRanked = allRaces.filter(r => r.status !== 'cancelled')
  const completedRanked = allRaces.filter(r => r.status === 'completed')

  // VR delta stats (from completed ranked races with rating_delta)
  const deltas = completedRanked.filter(r => r.rating_delta != null).map(r => r.rating_delta!)
  const totalVrDelta = deltas.length > 0 ? deltas.reduce((sum, d) => sum + d, 0) : null
  const avgVrDelta = deltas.length > 0 ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length : null
  const bestDelta = deltas.length > 0 ? Math.max(...deltas) : null
  const worstDelta = deltas.length > 0 ? Math.min(...deltas) : null

  // Placement distribution from completed ranked races
  const placementMap: Record<number, number> = {}
  for (const r of completedRanked) {
    if (r.placement != null) {
      placementMap[r.placement] = (placementMap[r.placement] ?? 0) + 1
    }
  }
  const placementEntries = (Object.entries(placementMap) as [string, number][])
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)

  // VR trend: completed ranked races sorted chronologically by session start then race_no
  const sessionMap = new Map(sessions.map(s => [s.id, s]))
  const trendRaces = allRaces
    .filter(r => r.status === 'completed' && r.rating_after != null)
    .sort((a, b) => {
      const ta = sessionMap.get(a.session_id)?.started_at ?? ''
      const tb = sessionMap.get(b.session_id)?.started_at ?? ''
      if (ta !== tb) return ta < tb ? -1 : 1
      return (a.race_no ?? 0) - (b.race_no ?? 0)
    })

  // Enhanced target stats from ranked non-cancelled races
  const targetAccumMap = new Map<string, TargetAccum>()
  for (const r of effectiveRanked) {
    const kind: 'course' | 'route' | null = r.course_id ? 'course' : r.route_id ? 'route' : null
    const id = r.course_id ?? r.route_id ?? null
    if (!kind || !id) continue
    const key = `${kind}:${id}`
    if (!targetAccumMap.has(key)) {
      targetAccumMap.set(key, { kind, id, count: 0, completedCount: 0, placementSum: 0, placementCount: 0, vrDeltaSum: 0, vrDeltaCount: 0 })
    }
    const acc = targetAccumMap.get(key)!
    acc.count++
    if (r.status === 'completed') {
      acc.completedCount++
      if (r.placement != null) { acc.placementSum += r.placement; acc.placementCount++ }
      if (r.rating_delta != null) { acc.vrDeltaSum += r.rating_delta; acc.vrDeltaCount++ }
    }
  }
  const validTargetRaceCount = effectiveRanked.filter(r => r.course_id || r.route_id).length
  const topTargetStats = [...targetAccumMap.values()]
    .map(acc => ({
      ...acc,
      pickRate: validTargetRaceCount > 0 ? (acc.count / validTargetRaceCount) * 100 : 0,
      avgPlacement: acc.placementCount > 0 ? acc.placementSum / acc.placementCount : null,
      avgVrDelta: acc.vrDeltaCount > 0 ? acc.vrDeltaSum / acc.vrDeltaCount : null,
      name: resolveName(acc.kind, acc.id, courses, routes),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (a.avgPlacement != null && b.avgPlacement != null) return a.avgPlacement - b.avgPlacement
      if (a.avgPlacement != null) return -1
      if (b.avgPlacement != null) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 10)

  const recentSessions = sessions.slice(0, 10)
  const sessionStatusLabel = (s: PlaySession) =>
    s.status === 'active' ? '進行中' : s.status === 'completed' ? '完了' : '中止'

  return (
    <div className="analytics">
      <div className="analytics__header">
        <span className="analytics__title">VR Analytics</span>
        <span className="analytics__window">{windowLabel}</span>
        <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
      </div>

      {dateFilter}

      <div className="panel">
        <div className="panel__title">Ranked サマリー</div>
        <div className="analytics__grid analytics__grid--3">
          {([
            ['セッション', sessions.length],
            ['完了レース', completedRanked.length],
            ['有効レース', effectiveRanked.length],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
        {activeAccount && (
          <div className="analytics__vr-row">
            <span className="analytics__vr-label">現在VR</span>
            <span className="analytics__vr-name">{activeAccount.display_name}</span>
            <span className="analytics__vr-value">{activeAccount.current_vr.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__title">VR デルタ</div>
        <div className="analytics__grid analytics__grid--4">
          {([
            ['合計', fmtDelta(totalVrDelta)],
            ['平均', avgVrDelta != null ? (avgVrDelta >= 0 ? `+${avgVrDelta.toFixed(1)}` : avgVrDelta.toFixed(1)) : '—'],
            ['Best', fmtDelta(bestDelta)],
            ['Worst', fmtDelta(worstDelta)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">VR 推移</div>
        {trendRaces.length === 0 ? (
          <p className="placeholder">完了済みランクレースがありません</p>
        ) : (
          <VrTrendChart races={trendRaces} />
        )}
      </div>

      {placementEntries.length > 0 && (
        <div className="panel">
          <div className="panel__title">順位分布</div>
          <div className="analytics__placement-list">
            {placementEntries.map(([placement, count]) => {
              const pct = completedRanked.length > 0 ? count / completedRanked.length : 0
              return (
                <div key={placement} className="analytics__placement-row">
                  <span className="analytics__placement-label">{placement}位</span>
                  <div className="analytics__placement-bar-wrap">
                    <div className="analytics__placement-bar" style={{ width: `${(pct * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="analytics__placement-count">{count}</span>
                  <span className="analytics__placement-pct">{(pct * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel__title">コース/ルート別スタッツ（上位10件）</div>
        {topTargetStats.length === 0 ? (
          <p className="placeholder">データなし</p>
        ) : (
          <ul className="analytics__target-ext-list">
            {topTargetStats.map((t, i) => (
              <li key={`${t.kind}:${t.id}`} className="analytics__target-ext-item">
                <div className="analytics__target-ext-top">
                  <span className="analytics__target-rank">{i + 1}</span>
                  <span className={`tag tag--${t.kind}`}>{t.kind === 'course' ? 'コース' : 'ルート'}</span>
                  <span className="analytics__target-name">{t.name}</span>
                  <span className="analytics__target-count">{t.count}</span>
                </div>
                <div className="analytics__target-ext-bot">
                  <span className="analytics__target-ext-stat">
                    <span className="analytics__target-ext-label">ピック率</span>
                    <span className="analytics__target-ext-value">{t.pickRate.toFixed(1)}%</span>
                  </span>
                  {t.avgPlacement != null && (
                    <span className="analytics__target-ext-stat">
                      <span className="analytics__target-ext-label">平均順位</span>
                      <span className="analytics__target-ext-value">{t.avgPlacement.toFixed(1)}</span>
                    </span>
                  )}
                  {t.avgVrDelta != null && (
                    <span className="analytics__target-ext-stat">
                      <span className="analytics__target-ext-label">平均VR</span>
                      <span className="analytics__target-ext-value"
                        style={{ color: t.avgVrDelta >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                        {t.avgVrDelta >= 0 ? '+' : ''}{t.avgVrDelta.toFixed(1)}
                      </span>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel__title">直近の Ranked セッション</div>
        <ul className="analytics__session-list">
          {recentSessions.map(s => {
            const sRaces = allRaces.filter(r => r.session_id === s.id)
            const completedCount = sRaces.filter(r => r.status === 'completed').length
            const raceDeltas = sRaces
              .filter(r => r.status === 'completed' && r.rating_delta != null)
              .map(r => r.rating_delta!)
            const sessionDelta = raceDeltas.length > 0 ? raceDeltas.reduce((a, b) => a + b, 0) : null
            return (
              <li key={s.id} className="analytics__session-row">
                <span className={`tag tag--status-${s.status}`}>{sessionStatusLabel(s)}</span>
                <span className="analytics__session-time">{fmtTime(s.started_at)}</span>
                <span className="analytics__session-races">{completedCount} レース</span>
                {sessionDelta != null && (
                  <span className={sessionDelta >= 0 ? 'records__delta--pos' : 'records__delta--neg'}>
                    {fmtDelta(sessionDelta)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
