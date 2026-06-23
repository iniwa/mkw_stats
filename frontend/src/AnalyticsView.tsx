import { useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, Route, Settings } from './api'

type Mode = 'vr' | 'lounge' | 'both'
type FieldFilter = 'all' | '24p' | '12p'

const MODE_LABELS: Record<Mode, string> = {
  vr: 'VR',
  lounge: 'Lounge',
  both: '両方',
}

const FIELD_FILTER_LABELS: Record<FieldFilter, string> = {
  all: '共通',
  '24p': '24人',
  '12p': '12人',
}

interface AnalyticsData {
  sessions: PlaySession[]
  races: RaceRecord[]
  courses: Course[]
  routes: Route[]
}

interface TargetStat {
  kind: 'course' | 'route'
  id: string
  name: string
  count: number
  pickRate: number
  avgPlacement: number | null
  placementCount: number
  band: { top: number; mid: number; bottom: number; total: number }
}

// Minimum completed races for a target to appear in the avg-placement highlights.
const MIN_PLACEMENT_SAMPLES = 2

function resolveName(kind: 'course' | 'route', id: string, courses: Course[], routes: Route[]): string {
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

// Classify a placement into top/middle/bottom third of the field.
function placementBand(placement: number, playerCount: number): 'top' | 'mid' | 'bottom' {
  const third = playerCount / 3
  if (placement <= third) return 'top'
  if (placement <= third * 2) return 'mid'
  return 'bottom'
}

export default function AnalyticsView() {
  const [mode, setMode] = useState<Mode>('both')
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>('all')
  // Lounge season filter. Preserved across mode switches but only applied in Lounge mode.
  const [season, setSeason] = useState<'all' | number>('all')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(50)
  const [showAll, setShowAll] = useState(false)
  const [sortBy, setSortBy] = useState<'count' | 'placement'>('count')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sources = mode === 'both' ? (['ranked', 'lounge'] as const) : mode === 'vr' ? (['ranked'] as const) : (['lounge'] as const)
      // Season filter is only meaningful for Lounge data; never let it touch ranked rows.
      const seasonParam = mode === 'lounge' && season !== 'all' ? season : undefined
      const [courses, routes, settingsRes, ...sessionGroups] = await Promise.all([
        api.getCourses(),
        api.getRoutes(),
        api.getSettings().catch((): Settings | null => null),
        ...sources.map(src => api.getSessions({
          source: src,
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
          lounge_season: seasonParam,
        })),
      ])
      setSettings(settingsRes)
      const sessions = sessionGroups.flat()
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      const sessionPlayerCount = new Map(sessions.map(s => [s.id, s.player_count]))
      // Attach a fallback player_count from the parent session when the race lacks one.
      const races = raceArrays.flat().map(r => ({
        ...r,
        player_count: r.player_count ?? sessionPlayerCount.get(r.session_id) ?? null,
      }))
      setData({ sessions, races, courses, routes })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [mode, dateFrom, dateTo, limit, season])

  const modeToggle = (
    <div className="seg">
      {(['vr', 'lounge', 'both'] as Mode[]).map(m => (
        <button
          key={m}
          className={`seg__btn${mode === m ? ' seg__btn--on' : ''}`}
          onClick={() => setMode(m)}
          disabled={loading}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  )

  // Player-size sub-filter: visible only when Lounge data is in scope (mode === 'lounge').
  const fieldFilterToggle = mode === 'lounge' ? (
    <div className="seg">
      {(['all', '24p', '12p'] as FieldFilter[]).map(f => (
        <button
          key={f}
          className={`seg__btn${fieldFilter === f ? ' seg__btn--on' : ''}`}
          onClick={() => setFieldFilter(f)}
          disabled={loading}
        >
          {FIELD_FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  ) : null

  // Season options: 0 .. current setting, extended upward if loaded data contains a
  // higher numbered season. Keep the selected option available even if Settings
  // cannot be loaded or the selected season currently has no sessions.
  const baseMaxSeason = Math.max(
    settings?.lounge_season ?? -1,
    season === 'all' ? -1 : season,
  )
  const dataMaxSeason = (data?.sessions ?? []).reduce(
    (m, s) => (s.lounge_season != null && s.lounge_season > m ? s.lounge_season : m),
    baseMaxSeason,
  )
  const seasonOptions = dataMaxSeason >= 0
    ? Array.from({ length: dataMaxSeason + 1 }, (_, i) => i).reverse()
    : []

  // Season selector: visible and applied only in Lounge mode (hidden for VR / both).
  const seasonSelect = mode === 'lounge' ? (
    <select
      className="date-filter__select"
      value={season}
      disabled={loading}
      onChange={e => setSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">全シーズン</option>
      {seasonOptions.map(n => <option key={n} value={n}>シーズン{n}</option>)}
    </select>
  ) : null

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

  if (loading) {
    return (
      <div className="analytics">
        <div className="analytics__header">
          <span className="analytics__title">Analytics</span>
          {modeToggle}
          {fieldFilterToggle}
          {seasonSelect}
        </div>
        <p className="placeholder">読み込み中…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="analytics">
        <div className="analytics__header">
          <span className="analytics__title">Analytics</span>
          {modeToggle}
          {fieldFilterToggle}
          {seasonSelect}
        </div>
        <p className="notice notice--error">{error ?? '読み込みに失敗しました'}</p>
        <div className="btn-row">
          <button className="btn" onClick={load}>再試行</button>
        </div>
      </div>
    )
  }

  const { sessions, races, courses, routes } = data
  const baseWindowLabel = (dateFrom || dateTo) ? 'フィルター中' : `直近 ${limit} セッション/ソース`
  // Make the season scope explicit in the filter summary (Lounge mode only).
  const seasonScopeLabel = season === 'all' ? '全シーズン' : `シーズン${season}`
  const windowLabel = mode === 'lounge' ? `${baseWindowLabel}・${seasonScopeLabel}` : baseWindowLabel

  // Aggregate per course/route from non-cancelled races.
  // When mode === 'lounge' and a player-size sub-filter is active, restrict by player_count.
  const effective = races.filter(r => {
    if (r.status === 'cancelled' || !(r.course_id || r.route_id)) return false
    if (mode === 'lounge' && fieldFilter !== 'all') {
      if (r.player_count == null) return false
      if (fieldFilter === '24p') return r.player_count >= 13
      if (fieldFilter === '12p') return r.player_count <= 12
    }
    return true
  })
  const accumMap = new Map<string, TargetStat>()
  for (const r of effective) {
    const kind: 'course' | 'route' = r.course_id ? 'course' : 'route'
    const id = (r.course_id ?? r.route_id)!
    const key = `${kind}:${id}`
    let acc = accumMap.get(key)
    if (!acc) {
      acc = {
        kind, id, name: resolveName(kind, id, courses, routes),
        count: 0, pickRate: 0, avgPlacement: null, placementCount: 0,
        band: { top: 0, mid: 0, bottom: 0, total: 0 },
      }
      accumMap.set(key, acc)
    }
    acc.count++
    if (r.status === 'completed' && r.placement != null) {
      acc.placementCount++
      acc.avgPlacement = (acc.avgPlacement ?? 0) + r.placement // sum for now, divide later
      if (r.player_count != null && r.player_count > 0) {
        const b = placementBand(r.placement, r.player_count)
        acc.band[b]++
        acc.band.total++
      }
    }
  }
  const totalPicks = effective.length
  const targetMatchCount = mode === 'lounge' ? sessions.length : null
  const stats = [...accumMap.values()].map(s => ({
    ...s,
    pickRate: totalPicks > 0 ? (s.count / totalPicks) * 100 : 0,
    avgPlacement: s.placementCount > 0 ? s.avgPlacement! / s.placementCount : null,
  }))

  // Highlights: top/bottom by pick count and by average placement.
  const byPickDesc = [...stats].sort((a, b) => b.count - a.count)
  const byPickAsc = [...stats].sort((a, b) => a.count - b.count)
  const placementRanked = stats.filter(s => s.placementCount >= MIN_PLACEMENT_SAMPLES && s.avgPlacement != null)
  const byPlacementBest = [...placementRanked].sort((a, b) => a.avgPlacement! - b.avgPlacement!)
  const byPlacementWorst = [...placementRanked].sort((a, b) => b.avgPlacement! - a.avgPlacement!)

  // Full list (sorted per current sort key).
  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'count') return b.count - a.count
    if (a.avgPlacement == null) return 1
    if (b.avgPlacement == null) return -1
    return a.avgPlacement - b.avgPlacement
  })
  const visible = showAll ? sorted : sorted.slice(0, 10)

  const targetChip = (t: TargetStat) => (
    <>
      <span className={`tag tag--${t.kind}`}>{t.kind === 'course' ? 'コース' : 'ルート'}</span>
      <span className="analytics__target-name">{t.name}</span>
    </>
  )

  return (
    <div className="analytics">
      <div className="analytics__header">
        <span className="analytics__title">Analytics</span>
        {modeToggle}
        {fieldFilterToggle}
        {seasonSelect}
        <span className="analytics__window">{windowLabel}</span>
        <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
      </div>

      {dateFilter}

      <div className="panel">
        <div className="panel__title">サマリー</div>
        <div className={`analytics__grid analytics__grid--${targetMatchCount == null ? '3' : '4'}`}>
          {([
            ['対象レース', totalPicks],
            ...(targetMatchCount == null ? [] : [['対象マッチ数', targetMatchCount] as [string, string | number]]),
            ['コース/ルート数', stats.length],
            ['ソース', MODE_LABELS[mode]],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="analytics__metric">
              <div className="analytics__metric-value">{value}</div>
              <div className="analytics__metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="placeholder">対象のレースがありません。</p>
      ) : (
        <>
          <div className="panel">
            <div className="panel__title">ハイライト</div>
            <div className="analytics__hl-grid">
              <div className="analytics__hl-col">
                <div className="lounge__section-label">ピック数 — 多い順</div>
                <ol className="analytics__hl-list">
                  {byPickDesc.slice(0, 3).map(t => (
                    <li key={`pd:${t.kind}:${t.id}`} className="analytics__hl-item">
                      {targetChip(t)}
                      <span className="analytics__hl-value">{t.count}回 ({t.pickRate.toFixed(1)}%)</span>
                    </li>
                  ))}
                </ol>
                <div className="lounge__section-label">ピック数 — 少ない順</div>
                <ol className="analytics__hl-list">
                  {byPickAsc.slice(0, 3).map(t => (
                    <li key={`pa:${t.kind}:${t.id}`} className="analytics__hl-item">
                      {targetChip(t)}
                      <span className="analytics__hl-value">{t.count}回 ({t.pickRate.toFixed(1)}%)</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="analytics__hl-col">
                <div className="lounge__section-label">平均順位 — 良い順</div>
                {byPlacementBest.length === 0 ? (
                  <p className="analytics__hl-empty">データ不足（{MIN_PLACEMENT_SAMPLES}回以上で集計）</p>
                ) : (
                  <ol className="analytics__hl-list">
                    {byPlacementBest.slice(0, 3).map(t => (
                      <li key={`pb:${t.kind}:${t.id}`} className="analytics__hl-item">
                        {targetChip(t)}
                        <span className="analytics__hl-value">{t.avgPlacement!.toFixed(1)}位</span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="lounge__section-label">平均順位 — 悪い順</div>
                {byPlacementWorst.length === 0 ? (
                  <p className="analytics__hl-empty">データ不足（{MIN_PLACEMENT_SAMPLES}回以上で集計）</p>
                ) : (
                  <ol className="analytics__hl-list">
                    {byPlacementWorst.slice(0, 3).map(t => (
                      <li key={`pw:${t.kind}:${t.id}`} className="analytics__hl-item">
                        {targetChip(t)}
                        <span className="analytics__hl-value">{t.avgPlacement!.toFixed(1)}位</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="analytics__list-head">
              <div className="panel__title" style={{ marginBottom: 0 }}>コース/ルート別スタッツ</div>
              <div className="seg">
                <button className={`seg__btn${sortBy === 'count' ? ' seg__btn--on' : ''}`}
                  onClick={() => setSortBy('count')}>ピック順</button>
                <button className={`seg__btn${sortBy === 'placement' ? ' seg__btn--on' : ''}`}
                  onClick={() => setSortBy('placement')}>平均順位順</button>
              </div>
            </div>
            <ul className="analytics__target-ext-list">
              {visible.map((t, i) => {
                const b = t.band
                const pctTop = b.total > 0 ? (b.top / b.total) * 100 : 0
                const pctMid = b.total > 0 ? (b.mid / b.total) * 100 : 0
                const pctBottom = b.total > 0 ? (b.bottom / b.total) * 100 : 0
                return (
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
                      <span className="analytics__target-ext-stat">
                        <span className="analytics__target-ext-label">平均順位</span>
                        <span className="analytics__target-ext-value">
                          {t.avgPlacement != null ? `${t.avgPlacement.toFixed(1)}位` : '—'}
                        </span>
                      </span>
                    </div>
                    {b.total > 0 && (
                      <div className="analytics__band-wrap">
                        <div className="analytics__band-bar">
                          <span className="analytics__band-seg analytics__band-seg--top" style={{ width: `${pctTop}%` }} />
                          <span className="analytics__band-seg analytics__band-seg--mid" style={{ width: `${pctMid}%` }} />
                          <span className="analytics__band-seg analytics__band-seg--bottom" style={{ width: `${pctBottom}%` }} />
                        </div>
                        <div className="analytics__band-legend">
                          <span className="analytics__band-tag analytics__band-tag--top">上位 {b.top}</span>
                          <span className="analytics__band-tag analytics__band-tag--mid">中位 {b.mid}</span>
                          <span className="analytics__band-tag analytics__band-tag--bottom">下位 {b.bottom}</span>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {sorted.length > 10 && (
              <div className="btn-row">
                <button className="btn" onClick={() => setShowAll(v => !v)}>
                  {showAll ? '上位10件のみ表示' : `全${sorted.length}件を表示`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
