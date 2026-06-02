import { useEffect, useState } from 'react'
import { api, PlaySession, RaceRecord, Settings, VrAccount } from './api'

interface VrData {
  sessions: PlaySession[]
  allRaces: RaceRecord[]
  settings: Settings | null
  vrAccounts: VrAccount[]
}

function fmtDelta(v: number | null): string {
  if (v == null) return '—'
  return v >= 0 ? `+${v}` : String(v)
}

function fmtValue(v: number | null): string {
  return v == null ? '—' : v.toLocaleString()
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

export default function VrView() {
  const [data, setData] = useState<VrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(50)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sessions, settings, vrAccounts] = await Promise.all([
        api.getSessions({
          source: 'ranked',
          limit,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
        }),
        api.getSettings().catch((): Settings | null => null),
        api.getVrAccounts().catch((): VrAccount[] => []),
      ])
      const raceArrays = await Promise.all(sessions.map(s => api.getSessionRaces(s.id, true)))
      setData({ sessions, allRaces: raceArrays.flat(), settings, vrAccounts })
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

  const { sessions, allRaces, settings, vrAccounts } = data
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
          <span className="analytics__title">VR</span>
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
  const vrValues = [
    ...trendRaces.map(r => r.rating_after!),
    ...(activeAccount ? [activeAccount.current_vr] : []),
  ]
  const maxVr = vrValues.length > 0 ? Math.max(...vrValues) : null
  const minVr = vrValues.length > 0 ? Math.min(...vrValues) : null

  const recentSessions = sessions.slice(0, 10)
  const sessionStatusLabel = (s: PlaySession) =>
    s.status === 'active' ? '進行中' : s.status === 'completed' ? '完了' : '中止'

  return (
    <div className="analytics">
      <div className="analytics__header">
        <span className="analytics__title">VR</span>
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
        <div className="analytics__grid analytics__grid--3" style={{ marginTop: '0.6rem' }}>
          <div className="analytics__metric analytics__metric--current">
            <div className="analytics__metric-value">{activeAccount ? activeAccount.current_vr.toLocaleString() : '—'}</div>
            <div className="analytics__metric-label">現在VR</div>
            {activeAccount && <div className="analytics__metric-sub">{activeAccount.display_name}</div>}
          </div>
          <div className="analytics__metric">
            <div className="analytics__metric-value">{fmtValue(maxVr)}</div>
            <div className="analytics__metric-label">最大VR</div>
          </div>
          <div className="analytics__metric">
            <div className="analytics__metric-value">{fmtValue(minVr)}</div>
            <div className="analytics__metric-label">最小VR</div>
          </div>
        </div>
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
