import { useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, Route, SessionStatus, SourceType, WARNING_LABELS } from './api'

type SourceFilter = SourceType | 'all'
type StatusFilter = SessionStatus | 'all'

const BAND_LABELS: Record<string, string> = { top: '上位', middle: '中位', bottom: '下位' }

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function resolveCourse(id: string, courses: Course[]): string {
  const c = courses.find(c => c.id === id)
  return c ? (c.short_name ?? c.name_ja ?? c.id) : id
}

function resolveRoute(id: string, routes: Route[]): string {
  const r = routes.find(r => r.id === id)
  return r ? (r.short_name ?? r.name_ja ?? r.id) : id
}

export default function RecordsView() {
  const [sessions, setSessions] = useState<PlaySession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<SourceFilter>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [races, setRaces] = useState<RaceRecord[]>([])
  const [racesLoading, setRacesLoading] = useState(false)
  const [racesError, setRacesError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sess, cList, rList] = await Promise.all([
        api.getSessions({
          limit: 50,
          source: filterSource === 'all' ? undefined : filterSource,
          status: filterStatus === 'all' ? undefined : filterStatus,
        }),
        api.getCourses(),
        api.getRoutes(),
      ])
      setSessions(sess)
      setCourses(cList)
      setRoutes(rList)
      if (selectedId && !sess.some(s => s.id === selectedId)) {
        setSelectedId(null)
        setRaces([])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterSource, filterStatus])

  async function selectSession(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      setRaces([])
      return
    }
    setSelectedId(id)
    setRacesLoading(true)
    setRacesError(null)
    setRaces([])
    try {
      setRaces(await api.getSessionRaces(id, true))
    } catch (e: unknown) {
      setRacesError(e instanceof Error ? e.message : 'レース取得エラー')
    } finally {
      setRacesLoading(false)
    }
  }

  const filtered = sessions

  const selectedSession = selectedId ? sessions.find(s => s.id === selectedId) ?? null : null

  return (
    <div className="records">
      <div className="records__head">
        <span className="records__title">Records</span>
        <button className="btn" onClick={load} disabled={loading}>再読み込み</button>
      </div>

      <div className="records__filters">
        <div className="records__filter-group">
          <span className="records__filter-label">ソース</span>
          <div className="seg">
            {(['all', 'ranked', 'lounge'] as const).map(v => (
              <button key={v}
                className={`seg__btn${filterSource === v ? ' seg__btn--on' : ''}`}
                disabled={loading}
                onClick={() => {
                  setFilterSource(v)
                  setSelectedId(null)
                  setRaces([])
                }}
              >
                {v === 'all' ? '全て' : v}
              </button>
            ))}
          </div>
        </div>
        <div className="records__filter-group">
          <span className="records__filter-label">ステータス</span>
          <div className="seg">
            {(['all', 'active', 'completed', 'cancelled'] as const).map(v => (
              <button key={v}
                className={`seg__btn${filterStatus === v ? ' seg__btn--on' : ''}`}
                disabled={loading}
                onClick={() => {
                  setFilterStatus(v)
                  setSelectedId(null)
                  setRaces([])
                }}
              >
                {v === 'all' ? '全て' : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="placeholder">読み込み中…</p>}
      {error && <div className="notice notice--error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <p className="placeholder">セッションがありません。</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={`records__body${selectedId ? '' : ' records__body--single'}`}>
          <div className="panel">
            <div className="panel__title">セッション ({filtered.length})</div>
            <ul className="records__session-list">
              {filtered.map(s => (
                <li key={s.id}
                  className={`records__session-item${selectedId === s.id ? ' records__session-item--selected' : ''}`}
                  onClick={() => selectSession(s.id)}
                >
                  <div className="records__session-row1">
                    <span className={`tag tag--${s.source}`}>{s.source}</span>
                    <span className={`tag tag--status-${s.status}`}>{s.status}</span>
                    <span className="records__session-time">{fmtTime(s.started_at)}</span>
                    {s.completed_at && (
                      <span className="records__session-time">→ {fmtTime(s.completed_at)}</span>
                    )}
                  </div>
                  <div className="records__session-row2">
                    {s.source === 'ranked' && s.vr_account_id && (
                      <span>VR:{s.vr_account_id.slice(0, 8)}</span>
                    )}
                    {s.source === 'lounge' && s.player_count != null && (
                      <span>{s.player_count}人{s.format ? ` ${s.format}` : ''}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {selectedId && (
            <div className="panel">
              <div className="panel__title">
                レース詳細
                {selectedSession && (
                  <span className="session-list__meta" style={{ marginLeft: '0.5rem' }}>
                    {fmtTime(selectedSession.started_at)}
                  </span>
                )}
              </div>
              {racesLoading && <p className="placeholder">読み込み中…</p>}
              {racesError && <div className="notice notice--error">{racesError}</div>}
              {!racesLoading && !racesError && races.length === 0 && (
                <p className="placeholder">レースがありません。</p>
              )}
              {!racesLoading && !racesError && races.length > 0 && (
                <ul className="race-history">
                  {races.map(r => (
                    <li key={r.id}
                      className={`race-history__item records__race-item${r.status === 'cancelled' ? ' records__race-item--cancelled' : ''}`}
                    >
                      <div className="records__race-row">
                        <span className="race-history__no">{r.race_no ?? '—'}</span>
                        <span className="race-history__name">
                          {r.course_id
                            ? resolveCourse(r.course_id, courses)
                            : r.route_id
                            ? resolveRoute(r.route_id, routes)
                            : '—'}
                        </span>
                        {r.status === 'cancelled' && (
                          <span className="tag tag--status-cancelled" style={{ fontSize: '0.7rem' }}>取消</span>
                        )}
                        {r.player_count != null && (
                          <span className="race-history__delta">{r.player_count}人</span>
                        )}
                        {r.placement_band && (
                          <span className="race-history__delta">
                            {BAND_LABELS[r.placement_band] ?? r.placement_band}
                          </span>
                        )}
                        {r.rating_delta != null && (
                          <span className={`race-history__delta ${r.rating_delta >= 0 ? 'records__delta--pos' : 'records__delta--neg'}`}>
                            {r.rating_delta >= 0 ? '+' : ''}{r.rating_delta}
                          </span>
                        )}
                        {r.rating_before != null && r.rating_after != null && (
                          <span className="race-history__delta records__vr-range">
                            {r.rating_before}→{r.rating_after}
                          </span>
                        )}
                      </div>
                      {r.warning_flags && r.warning_flags.length > 0 && (
                        <div className="records__race-warnings">
                          {r.warning_flags.map(f => (
                            <span key={f}>⚠ {WARNING_LABELS[f] ?? f}</span>
                          ))}
                        </div>
                      )}
                      {r.memo && <div className="records__memo">{r.memo}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
