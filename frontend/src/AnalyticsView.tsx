import { useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, Route, WARNING_LABELS } from './api'

interface AnalyticsData {
  sessions: PlaySession[]
  allRaces: RaceRecord[]
  courses: Course[]
  routes: Route[]
}

const BAND_LABELS: { band: 'top' | 'middle' | 'bottom'; label: string }[] = [
  { band: 'top', label: '上位' },
  { band: 'middle', label: '中位' },
  { band: 'bottom', label: '下位' },
]

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

function toFromISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toISOString()
}

function toToISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day + 1).toISOString()
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
      const [sessions, courses, routes] = await Promise.all([
        api.getSessions({
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
        }),
        api.getCourses(),
        api.getRoutes(),
      ])
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      setData({ sessions, allRaces: raceArrays.flat(), courses, routes })
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

  const { sessions, allRaces, courses, routes } = data

  const windowLabel = (dateFrom || dateTo) ? 'Filtered sessions' : `Recent ${limit} sessions`

  if (sessions.length === 0) {
    return (
      <div className="analytics">
        <div className="analytics__header">
          <span className="analytics__title">Analytics</span>
          <span className="analytics__window">{windowLabel}</span>
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
        <p className="placeholder">セッションがありません。</p>
      </div>
    )
  }

  // Session totals
  const sTotals = {
    total: sessions.length,
    ranked: sessions.filter(s => s.source === 'ranked').length,
    lounge: sessions.filter(s => s.source === 'lounge').length,
    active: sessions.filter(s => s.status === 'active').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    cancelled: sessions.filter(s => s.status === 'cancelled').length,
  }

  // Race totals
  const rTotals = {
    total: allRaces.length,
    completed: allRaces.filter(r => r.status === 'completed').length,
    draft: allRaces.filter(r => r.status === 'draft').length,
    cancelled: allRaces.filter(r => r.status === 'cancelled').length,
    ranked: allRaces.filter(r => r.source === 'ranked').length,
    lounge: allRaces.filter(r => r.source === 'lounge').length,
  }

  // Ranked summary
  const completedRanked = allRaces.filter(r => r.source === 'ranked' && r.status === 'completed')
  const deltas = completedRanked.filter(r => r.rating_delta != null).map(r => r.rating_delta!)
  const totalVrDelta = deltas.reduce((sum, d) => sum + d, 0)
  const avgVrDelta = deltas.length > 0 ? totalVrDelta / deltas.length : null
  const bestDelta = deltas.length > 0 ? Math.max(...deltas) : null
  const worstDelta = deltas.length > 0 ? Math.min(...deltas) : null
  const bandCounts = { top: 0, middle: 0, bottom: 0 }
  for (const r of completedRanked) {
    if (r.placement_band === 'top') bandCounts.top++
    else if (r.placement_band === 'middle') bandCounts.middle++
    else if (r.placement_band === 'bottom') bandCounts.bottom++
  }

  // Lounge summary
  const loungeRaces = allRaces.filter(r => r.source === 'lounge')
  const completedLoungeCount = loungeRaces.filter(r => r.status === 'completed').length
  const warnCounts: Record<string, number> = {}
  for (const r of loungeRaces) {
    for (const f of r.warning_flags ?? []) {
      warnCounts[f] = (warnCounts[f] ?? 0) + 1
    }
  }
  const warnEntries = Object.entries(warnCounts).sort((a, b) => b[1] - a[1])

  // Most-used targets (non-cancelled)
  const targetMap = new Map<string, { kind: 'course' | 'route'; id: string; count: number }>()
  for (const r of allRaces) {
    if (r.status === 'cancelled') continue
    if (r.course_id) {
      const key = `course:${r.course_id}`
      const entry = targetMap.get(key)
      if (entry) entry.count++
      else targetMap.set(key, { kind: 'course', id: r.course_id, count: 1 })
    } else if (r.route_id) {
      const key = `route:${r.route_id}`
      const entry = targetMap.get(key)
      if (entry) entry.count++
      else targetMap.set(key, { kind: 'route', id: r.route_id, count: 1 })
    }
  }
  const topTargets = [...targetMap.values()].sort((a, b) => b.count - a.count).slice(0, 8)

  const rankedMetrics: [string, string | number][] = [
    ['完了レース', completedRanked.length],
    ['VR合計', fmtDelta(deltas.length > 0 ? totalVrDelta : null)],
    ['平均VR', avgVrDelta != null ? (avgVrDelta >= 0 ? `+${avgVrDelta.toFixed(1)}` : avgVrDelta.toFixed(1)) : '—'],
    ['Best', fmtDelta(bestDelta)],
    ['Worst', fmtDelta(worstDelta)],
  ]

  return (
    <div className="analytics">
      <div className="analytics__header">
        <span className="analytics__title">Analytics</span>
        <span className="analytics__window">{windowLabel}</span>
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
        <div className="panel__title">セッション集計</div>
        <div className="analytics__grid analytics__grid--6">
          {([
            ['合計', sTotals.total],
            ['Ranked', sTotals.ranked],
            ['Lounge', sTotals.lounge],
            ['進行中', sTotals.active],
            ['完了', sTotals.completed],
            ['取消', sTotals.cancelled],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">レース集計</div>
        <div className="analytics__grid analytics__grid--6">
          {([
            ['合計', rTotals.total],
            ['完了', rTotals.completed],
            ['Draft', rTotals.draft],
            ['取消', rTotals.cancelled],
            ['Ranked', rTotals.ranked],
            ['Lounge', rTotals.lounge],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Ranked サマリー</div>
        <div className="analytics__grid analytics__grid--3">
          {rankedMetrics.map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="analytics__band-row">
          {BAND_LABELS.map(({ band, label }) => (
            <div key={band} className="analytics__band">
              <span className="analytics__band-label">{label}</span>
              <span className="analytics__band-value">{bandCounts[band]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Lounge サマリー</div>
        <div className="analytics__metric analytics__metric--solo">
          <div className="analytics__metric-value">{completedLoungeCount}</div>
          <div className="analytics__metric-label">完了レース</div>
        </div>
        {warnEntries.length === 0 ? (
          <p className="placeholder analytics__warn-empty">警告レコードなし</p>
        ) : (
          <div className="analytics__warn-list">
            {warnEntries.map(([flag, count]) => (
              <div key={flag} className="analytics__warn-row">
                <span className="analytics__warn-label">{WARNING_LABELS[flag] ?? flag}</span>
                <span className="analytics__warn-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__title">よく使うコース/ルート（上位8件）</div>
        {topTargets.length === 0 ? (
          <p className="placeholder">データなし</p>
        ) : (
          <ul className="analytics__target-list">
            {topTargets.map((t, i) => (
              <li key={`${t.kind}:${t.id}`} className="analytics__target-row">
                <span className="analytics__target-rank">{i + 1}</span>
                <span className={`tag tag--${t.kind}`}>{t.kind === 'course' ? 'コース' : 'ルート'}</span>
                <span className="analytics__target-name">
                  {resolveName(t.kind, t.id, courses, routes)}
                </span>
                <span className="analytics__target-count">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
