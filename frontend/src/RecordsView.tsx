import { useEffect, useState } from 'react'
import { api, Course, PlaySession, RaceRecord, RaceUpdateBody, Route, SessionStatus, SourceType, WARNING_LABELS } from './api'
import { RouteDetail } from './RouteDetail'

type SourceFilter = SourceType | 'all'
type StatusFilter = SessionStatus | 'all'

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

function toFromISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toISOString()
}

function toToISO(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day + 1).toISOString()
}

export default function RecordsView() {
  const [sessions, setSessions] = useState<PlaySession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<SourceFilter>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(50)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [races, setRaces] = useState<RaceRecord[]>([])
  const [racesLoading, setRacesLoading] = useState(false)
  const [racesError, setRacesError] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMemo, setEditMemo] = useState('')
  const [editPlayerCount, setEditPlayerCount] = useState('')
  const [editPlacement, setEditPlacement] = useState('')
  const [editRatingAfter, setEditRatingAfter] = useState('')
  const [editScore, setEditScore] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  function onClearSelection() {
    setSelectedId(null)
    setRaces([])
    setEditingId(null)
    setRowErrors({})
    setShowHidden(false)
  }

  async function loadRaces(id: string, includeHidden = false) {
    setRacesLoading(true)
    setRacesError(null)
    setRaces([])
    try {
      setRaces(await api.getSessionRaces(id, true, includeHidden))
    } catch (e: unknown) {
      setRacesError(e instanceof Error ? e.message : 'レース取得エラー')
    } finally {
      setRacesLoading(false)
    }
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sess, cList, rList] = await Promise.all([
        api.getSessions({
          limit,
          source: filterSource === 'all' ? undefined : filterSource,
          status: filterStatus === 'all' ? undefined : filterStatus,
          started_from: dateFrom ? toFromISO(dateFrom) : undefined,
          started_to: dateTo ? toToISO(dateTo) : undefined,
        }),
        api.getCourses(),
        api.getRoutes(),
      ])
      setSessions(sess)
      setCourses(cList)
      setRoutes(rList)
      if (selectedId && !sess.some(s => s.id === selectedId)) {
        onClearSelection()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [filterSource, filterStatus, dateFrom, dateTo, limit])

  async function selectSession(id: string) {
    if (selectedId === id) {
      onClearSelection()
      return
    }
    setSelectedId(id)
    setEditingId(null)
    setRowErrors({})
    setShowHidden(false)
    await loadRaces(id, false)
  }

  function clearEditStates() {
    setEditMemo('')
    setEditPlayerCount('')
    setEditPlacement('')
    setEditRatingAfter('')
    setEditScore('')
  }

  async function saveEdit(raceId: string, race: RaceRecord) {
    setPendingId(raceId)
    setRowErrors(prev => { const n = { ...prev }; delete n[raceId]; return n })
    try {
      const body: RaceUpdateBody = { memo: editMemo.trim() || null }
      const pc = Number(editPlayerCount)
      if (editPlayerCount !== '' && pc >= 1) body.player_count = pc
      const pl = Number(editPlacement)
      if (editPlacement !== '' && pl >= 1) body.placement = pl
      if (race.source === 'ranked') {
        const ra = Number(editRatingAfter)
        if (editRatingAfter !== '' && ra >= 0) body.rating_after = ra
      }
      if (race.source === 'lounge') {
        const sc = Number(editScore)
        if (editScore !== '' && sc >= 0) body.score = sc
      }
      await api.updateRaceRecord(raceId, body)
      setEditingId(null)
      clearEditStates()
      if (selectedId) await loadRaces(selectedId, showHidden)
    } catch (e: unknown) {
      setRowErrors(prev => ({ ...prev, [raceId]: e instanceof Error ? e.message : '保存エラー' }))
    } finally {
      setPendingId(null)
    }
  }

  async function cancelRace(raceId: string) {
    if (!window.confirm('このレースを取消しますか？（削除ではなく取消済みとして残ります）')) return
    setPendingId(raceId)
    setRowErrors(prev => { const n = { ...prev }; delete n[raceId]; return n })
    try {
      await api.cancelRaceRecord(raceId)
      if (selectedId) await loadRaces(selectedId, showHidden)
    } catch (e: unknown) {
      setRowErrors(prev => ({ ...prev, [raceId]: e instanceof Error ? e.message : '取消エラー' }))
    } finally {
      setPendingId(null)
    }
  }

  async function hideRace(raceId: string) {
    if (!window.confirm('このレースを非表示にしますか？\n誤って入力したレースを通常の履歴と分析から除外します。')) return
    setPendingId(raceId)
    setRowErrors(prev => { const n = { ...prev }; delete n[raceId]; return n })
    try {
      await api.hideRaceRecord(raceId)
      if (selectedId) await loadRaces(selectedId, showHidden)
    } catch (e: unknown) {
      setRowErrors(prev => ({ ...prev, [raceId]: e instanceof Error ? e.message : '非表示エラー' }))
    } finally {
      setPendingId(null)
    }
  }

  async function restoreRace(raceId: string) {
    if (!window.confirm('このレースを表示に戻しますか？')) return
    setPendingId(raceId)
    setRowErrors(prev => { const n = { ...prev }; delete n[raceId]; return n })
    try {
      await api.restoreRaceRecord(raceId)
      if (selectedId) await loadRaces(selectedId, showHidden)
    } catch (e: unknown) {
      setRowErrors(prev => ({ ...prev, [raceId]: e instanceof Error ? e.message : '復元エラー' }))
    } finally {
      setPendingId(null)
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
                  onClearSelection()
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
                  onClearSelection()
                }}
              >
                {v === 'all' ? '全て' : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="date-filter">
        <div className="date-filter__group">
          <span className="date-filter__label">開始日</span>
          <input
            type="date"
            className="date-filter__input"
            value={dateFrom}
            disabled={loading}
            onChange={e => {
              setDateFrom(e.target.value)
              onClearSelection()
            }}
          />
        </div>
        <div className="date-filter__group">
          <span className="date-filter__label">終了日</span>
          <input
            type="date"
            className="date-filter__input"
            value={dateTo}
            disabled={loading}
            onChange={e => {
              setDateTo(e.target.value)
              onClearSelection()
            }}
          />
        </div>
        <div className="date-filter__group">
          <span className="date-filter__label">件数</span>
          <select
            className="date-filter__select"
            value={limit}
            disabled={loading}
            onChange={e => {
              setLimit(Number(e.target.value))
              onClearSelection()
            }}
          >
            {[25, 50, 100, 200].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <button
          className="btn"
          disabled={loading || (!dateFrom && !dateTo)}
          onClick={() => {
            setDateFrom('')
            setDateTo('')
            onClearSelection()
          }}
        >
          日付クリア
        </button>
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
              <div className="records__hidden-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={e => {
                      const next = e.target.checked
                      setShowHidden(next)
                      if (selectedId) loadRaces(selectedId, next)
                    }}
                  />
                  非表示も表示
                </label>
              </div>
              {racesLoading && <p className="placeholder">読み込み中…</p>}
              {racesError && <div className="notice notice--error">{racesError}</div>}
              {!racesLoading && !racesError && races.length === 0 && (
                <p className="placeholder">レースがありません。</p>
              )}
              {!racesLoading && !racesError && races.length > 0 && (
                <ul className="race-history">
                  {races.map(r => {
                    const routeForDetail = r.route_id ? (routes.find(rt => rt.id === r.route_id) ?? null) : null
                    const isEditing = editingId === r.id
                    const isPending = pendingId === r.id
                    return (
                    <li key={r.id}
                      className={`race-history__item records__race-item${r.status === 'cancelled' ? ' records__race-item--cancelled' : ''}${r.is_hidden ? ' records__race-item--hidden' : ''}`}
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
                        {r.is_hidden && (
                          <span className="tag tag--hidden" style={{ fontSize: '0.7rem' }}>非表示</span>
                        )}
                        {r.player_count != null && (
                          <span className="race-history__delta">{r.player_count}人</span>
                        )}
                        {r.placement != null && (
                          <span className="race-history__delta">{r.placement}位</span>
                        )}
                        {r.score != null && (
                          <span className="race-history__delta">{r.score}pt</span>
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
                      {isEditing ? (
                        <div className="records__edit-area">
                          <div className="records__edit-grid">
                            <div className="records__edit-field">
                              <span className="records__edit-label">人数</span>
                              <input type="number" className="records__edit-input" min={1}
                                value={editPlayerCount} disabled={isPending}
                                onChange={e => setEditPlayerCount(e.target.value)} />
                            </div>
                            <div className="records__edit-field">
                              <span className="records__edit-label">順位</span>
                              <input type="number" className="records__edit-input" min={1}
                                value={editPlacement} disabled={isPending}
                                onChange={e => setEditPlacement(e.target.value)} />
                            </div>
                            {r.source === 'ranked' && (
                              <div className="records__edit-field">
                                <span className="records__edit-label">結果VR</span>
                                <input type="number" className="records__edit-input" min={0}
                                  value={editRatingAfter} disabled={isPending}
                                  onChange={e => setEditRatingAfter(e.target.value)} />
                              </div>
                            )}
                            {r.source === 'lounge' && (
                              <div className="records__edit-field">
                                <span className="records__edit-label">スコア</span>
                                <input type="number" className="records__edit-input" min={0}
                                  value={editScore} disabled={isPending}
                                  onChange={e => setEditScore(e.target.value)} />
                              </div>
                            )}
                          </div>
                          <textarea className="records__memo-edit" value={editMemo}
                            onChange={e => setEditMemo(e.target.value)}
                            rows={2} disabled={isPending} placeholder="メモ（任意）" />
                          <div className="records__actions">
                            <button className="btn btn--sm btn--primary" disabled={isPending}
                              onClick={() => saveEdit(r.id, r)}>保存</button>
                            <button className="btn btn--sm" disabled={isPending}
                              onClick={() => {
                                setEditingId(null)
                                clearEditStates()
                                setRowErrors(prev => { const n = { ...prev }; delete n[r.id]; return n })
                              }}>キャンセル</button>
                          </div>
                        </div>
                      ) : (
                        r.memo && <div className="records__memo">{r.memo}</div>
                      )}
                      {rowErrors[r.id] && (
                        <div className="records__row-error">{rowErrors[r.id]}</div>
                      )}
                      {!isEditing && (
                        <div className="records__actions">
                          {r.is_hidden ? (
                            <button className="btn btn--sm btn--primary" disabled={pendingId !== null}
                              onClick={() => restoreRace(r.id)}>表示に戻す</button>
                          ) : (
                            <>
                              <button className="btn btn--sm" disabled={pendingId !== null}
                                onClick={() => {
                                  setEditingId(r.id)
                                  setEditMemo(r.memo ?? '')
                                  setEditPlayerCount(r.player_count != null ? String(r.player_count) : '')
                                  setEditPlacement(r.placement != null ? String(r.placement) : '')
                                  setEditRatingAfter(r.rating_after != null ? String(r.rating_after) : '')
                                  setEditScore(r.score != null ? String(r.score) : '')
                                  setRowErrors(prev => { const n = { ...prev }; delete n[r.id]; return n })
                                }}>編集</button>
                              {r.status !== 'cancelled' && (
                                <button className="btn btn--sm btn--danger" disabled={pendingId !== null}
                                  onClick={() => cancelRace(r.id)}>取消</button>
                              )}
                              <button className="btn btn--sm btn--danger" disabled={pendingId !== null}
                                onClick={() => hideRace(r.id)}>非表示</button>
                            </>
                          )}
                        </div>
                      )}
                      {routeForDetail && <RouteDetail route={routeForDetail} compact />}
                    </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
