import { useCallback, useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, Route, WARNING_LABELS } from './api'

interface LoungeData {
  sessions: PlaySession[]
  racesBySession: Map<string, RaceRecord[]>
  courses: Course[]
  routes: Route[]
}

interface WarnEntry {
  sessionStartedAt: string
  raceNo: number | null
  targetName: string
  flags: string[]
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

export default function LoungeView() {
  const [data, setData] = useState<LoungeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sessions, courses, routes] = await Promise.all([
        api.getSessions({ source: 'lounge', limit: 50 }),
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
  }, [])

  useEffect(() => { load() }, [load])

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

  if (sessions.length === 0) {
    return (
      <div className="lounge">
        <div className="lounge__header">
          <span className="lounge__title">Lounge</span>
          <span className="lounge__window">Recent 50 Lounge sessions</span>
        </div>
        <p className="placeholder">Lounge セッションがありません。</p>
      </div>
    )
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const recentSessions = sessions.slice(0, 10)

  // Warning aggregation — sessions in returned order (newest first), races in race order
  const warnCounts: Record<string, number> = {}
  const warnEntries: WarnEntry[] = []
  for (const s of sessions) {
    const races = racesBySession.get(s.id) ?? []
    for (const r of races) {
      if (!r.warning_flags?.length) continue
      for (const f of r.warning_flags) warnCounts[f] = (warnCounts[f] ?? 0) + 1
      const kind = r.course_id ? 'course' : r.route_id ? 'route' : null
      warnEntries.push({
        sessionStartedAt: s.started_at,
        raceNo: r.race_no,
        targetName: kind
          ? resolveName(kind, r.course_id ?? r.route_id!, courses, routes)
          : '不明',
        flags: r.warning_flags,
      })
    }
  }
  const warnFlagEntries = Object.entries(warnCounts).sort((a, b) => b[1] - a[1])

  // Most-used targets: completed + draft, exclude cancelled
  const targetMap = new Map<string, { kind: 'course' | 'route'; id: string; count: number }>()
  for (const s of sessions) {
    const races = racesBySession.get(s.id) ?? []
    for (const r of races) {
      if (r.status === 'cancelled') continue
      if (r.course_id) {
        const key = `course:${r.course_id}`
        const e = targetMap.get(key)
        if (e) e.count++
        else targetMap.set(key, { kind: 'course', id: r.course_id, count: 1 })
      } else if (r.route_id) {
        const key = `route:${r.route_id}`
        const e = targetMap.get(key)
        if (e) e.count++
        else targetMap.set(key, { kind: 'route', id: r.route_id, count: 1 })
      }
    }
  }
  const topTargets = [...targetMap.values()].sort((a, b) => b.count - a.count).slice(0, 8)

  const statusLabel = (s: PlaySession) =>
    s.status === 'active' ? '進行中' : s.status === 'completed' ? '完了' : '中止'

  return (
    <div className="lounge">
      <div className="lounge__header">
        <span className="lounge__title">Lounge</span>
        <span className="lounge__window">Recent 50 Lounge sessions</span>
        <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
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

      <div className="panel">
        <div className="panel__title">警告レコード</div>
        {warnFlagEntries.length === 0 ? (
          <p className="placeholder">警告レコードなし</p>
        ) : (
          <>
            <div className="lounge__warn-summary">
              {warnFlagEntries.map(([flag, count]) => (
                <div key={flag} className="analytics__warn-row">
                  <span className="analytics__warn-label">{WARNING_LABELS[flag] ?? flag}</span>
                  <span className="analytics__warn-count">{count}</span>
                </div>
              ))}
            </div>
            <div className="lounge__section-label">詳細</div>
            <ul className="lounge__warn-detail">
              {warnEntries.map((entry, i) => (
                <li key={i} className="lounge__warn-item">
                  <span className="lounge__meta">{fmtTime(entry.sessionStartedAt)}</span>
                  {entry.raceNo != null && (
                    <span className="lounge__meta">Race {entry.raceNo}</span>
                  )}
                  <span className="lounge__warn-target">{entry.targetName}</span>
                  <span className="lounge__warn-flags">
                    {entry.flags.map(f => WARNING_LABELS[f] ?? f).join('、')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel__title">よく使う Lounge コース/ルート（上位8件）</div>
        {topTargets.length === 0 ? (
          <p className="placeholder">データなし</p>
        ) : (
          <ul className="analytics__target-list">
            {topTargets.map((t, i) => (
              <li key={`${t.kind}:${t.id}`} className="analytics__target-row">
                <span className="analytics__target-rank">{i + 1}</span>
                <span className={`tag tag--${t.kind}`}>
                  {t.kind === 'course' ? 'コース' : 'ルート'}
                </span>
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
