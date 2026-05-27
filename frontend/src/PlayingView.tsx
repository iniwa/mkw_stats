import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  WARNING_LABELS,
  api,
  type CompleteLoungeBody,
  type CompleteRankedBody,
  type Course,
  type CourseNote,
  type MapAnnotation,
  type MapPoint,
  type PlaySession,
  type RaceRecord,
  type ResolveResult,
  type Route,
  type SourceType,
  type Settings,
  type VrAccount,
} from './api'
import { RouteDetail } from './RouteDetail'
import { TargetImage } from './TargetImage'
import { TargetAssist } from './TargetAssist'
import { WorldMapPicker } from './WorldMapPicker'

type LoadState = 'loading' | 'ready' | 'error'

const LOUNGE_FORMATS = ['FFA', '2v2', '3v3', '4v4', '6v6']

const LOUNGE_SCORE_TABLE: Readonly<Record<number, number>> = {
  1: 15, 2: 12, 3: 10, 4: 9, 5: 9, 6: 8, 7: 8, 8: 7, 9: 7, 10: 6,
  11: 6, 12: 6, 13: 5, 14: 5, 15: 5, 16: 4, 17: 4, 18: 4, 19: 3, 20: 3,
  21: 3, 22: 2, 23: 2, 24: 1,
}

function courseName(course: Course | undefined): string {
  if (!course) return '不明なコース'
  return course.name_ja || course.name_en || course.id
}

function routeName(route: Route | undefined, courses: Map<string, Course>): string {
  if (!route) return '不明な道中コース'
  if (route.name_ja) return route.name_ja
  const from = courses.get(route.from_course_id)
  const to = courses.get(route.to_course_id)
  return `${courseName(from)} → ${courseName(to)}`
}

export default function PlayingView() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  const [settings, setSettings] = useState<Settings | null>(null)
  const [vrAccounts, setVrAccounts] = useState<VrAccount[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [activeSessions, setActiveSessions] = useState<PlaySession[]>([])

  const [session, setSession] = useState<PlaySession | null>(null)
  const [resolved, setResolved] = useState<ResolveResult | null>(null)
  const [draftRace, setDraftRace] = useState<RaceRecord | null>(null)
  const [recordedRaces, setRecordedRaces] = useState<RaceRecord[]>([])
  const [lastWarnings, setLastWarnings] = useState<string[]>([])

  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [autoSyncMsg, setAutoSyncMsg] = useState<string | null>(null)
  const [autoSyncError, setAutoSyncError] = useState<string | null>(null)

  const coursesById = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses])
  const routesById = useMemo(() => new Map(routes.map(r => [r.id, r])), [routes])

  const loadReferenceData = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      const [settingsData, accounts, sessions, points, courseList, routeList] = await Promise.all([
        api.getSettings(),
        api.getVrAccounts(),
        api.getActiveSessions(),
        api.getMapPoints(),
        api.getCourses(),
        api.getRoutes(),
      ])
      setSettings(settingsData)
      setVrAccounts(accounts)
      setActiveSessions(sessions)
      setMapPoints(points)
      setCourses(courseList)
      setRoutes(routeList)
      setLoadState('ready')
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'データの読み込みに失敗しました')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadReferenceData()
  }, [loadReferenceData])

  const runAction = useCallback(
    async (name: string, fn: () => Promise<void>) => {
      setBusy(name)
      setActionError(null)
      try {
        await fn()
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : '操作に失敗しました')
      } finally {
        setBusy(null)
      }
    },
    [],
  )

  const refreshAccounts = useCallback(async () => {
    try {
      setVrAccounts(await api.getVrAccounts())
    } catch {
      /* non-fatal: keep the previous account values */
    }
  }, [])

  // Persisted race history is authoritative — refetch instead of patching local state.
  const reloadRaces = useCallback(async (sessionId: string) => {
    setRecordedRaces(await api.getSessionRaces(sessionId))
  }, [])

  const resetSessionState = useCallback(() => {
    setResolved(null)
    setDraftRace(null)
    setRecordedRaces([])
    setLastWarnings([])
    setActionError(null)
    setAutoSyncMsg(null)
    setAutoSyncError(null)
  }, [])

  // -- Auto MMR sync -------------------------------------------------------
  const maybeAutoSyncLoungeMmr = async (nextSession: PlaySession): Promise<void> => {
    if (nextSession.source !== 'lounge') return
    if (nextSession.status !== 'completed') return
    if (!settings?.lounge_auto_sync) return
    setAutoSyncMsg('MMRを自動同期しています...')
    setAutoSyncError(null)
    try {
      const result = await api.mmrSync()
      setAutoSyncMsg(`MMR自動同期: ${result.message}`)
      if (result.updated_session && result.updated_session.id === nextSession.id) {
        setSession(result.updated_session)
      }
    } catch (err) {
      setAutoSyncError(`MMR自動同期に失敗しました: ${err instanceof ApiError ? err.message : '通信エラー'}`)
      setAutoSyncMsg(null)
    }
  }

  // -- Session lifecycle ---------------------------------------------------
  const createSession = (source: SourceType, playerCount?: number, format?: string) =>
    runAction('create-session', async () => {
      const created = await api.createSession({ source, player_count: playerCount, format })
      resetSessionState()
      setSession(created)
    })

  const resumeSession = (target: PlaySession) =>
    runAction('resume', async () => {
      resetSessionState()
      const races = await api.getSessionRaces(target.id)
      const completed = races.filter(r => r.status === 'completed')
      setRecordedRaces(completed)
      const drafts = races.filter(r => r.status === 'draft')
      const draft = drafts.length > 0 ? drafts[drafts.length - 1] : null
      setDraftRace(draft)
      if (draft?.warning_flags?.length) {
        setLastWarnings(draft.warning_flags)
      } else {
        const latestWithWarnings = [...completed].reverse().find(
          r => r.warning_flags && r.warning_flags.length > 0,
        )
        if (latestWithWarnings?.warning_flags) {
          setLastWarnings(latestWithWarnings.warning_flags)
        }
      }
      setSession(target)
    })

  const finishSession = () =>
    runAction('finish', async () => {
      if (!session) return
      const finished = await api.finishSession(session.id)
      setSession(finished)
      await maybeAutoSyncLoungeMmr(finished)
    })

  const leaveSession = () =>
    runAction('leave', async () => {
      resetSessionState()
      setSession(null)
      setActiveSessions(await api.getActiveSessions())
    })

  // -- Course selection ----------------------------------------------------
  const resolveSelection = (fromId: string, toId: string) =>
    runAction('resolve', async () => {
      setResolved(await api.resolveSelection(fromId, toId))
    })

  const cancelSelection = () => {
    setResolved(null)
    setActionError(null)
  }

  const confirmSelection = () =>
    runAction('confirm', async () => {
      if (!session || !resolved) return
      const target =
        resolved.kind === 'course'
          ? { course_id: resolved.course!.id }
          : { route_id: resolved.route!.id }
      const response = await api.draftRace(session.id, target)
      setResolved(null)
      setDraftRace(response.race)
      if (session.source === 'ranked') {
        setLastWarnings([])
      } else {
        setLastWarnings(response.warnings)
      }
    })

  // -- Ranked result -------------------------------------------------------
  const completeRanked = (body: CompleteRankedBody) =>
    runAction('complete-ranked', async () => {
      if (!draftRace || !session) return
      await api.completeRanked(draftRace.id, body)
      setDraftRace(null)
      setLastWarnings([])
      await reloadRaces(session.id)
      await refreshAccounts()
    })

  // -- Lounge result -------------------------------------------------------
  const completeLounge = (body: CompleteLoungeBody) =>
    runAction('complete-lounge', async () => {
      if (!draftRace || !session) return
      await api.completeLounge(draftRace.id, body)
      setDraftRace(null)
      setLastWarnings([])
      await reloadRaces(session.id)
      const fetchedSession = await api.getSession(session.id)
      setSession(fetchedSession)
      if (fetchedSession.status === 'completed') {
        await maybeAutoSyncLoungeMmr(fetchedSession)
      }
    })

  // -- Map point calibration -----------------------------------------------
  const handleMapPointUpdated = useCallback((updated: MapPoint) => {
    setMapPoints(prev => prev.map(mp => mp.id === updated.id ? updated : mp))
  }, [])

  // -- Session controls ----------------------------------------------------
  const undoLastRace = () =>
    runAction('undo', async () => {
      if (!session) return
      await api.undoLastRace(session.id)
      setLastWarnings([])
      setResolved(null)
      setDraftRace(null)
      await reloadRaces(session.id)
      setSession(await api.getSession(session.id))
      await refreshAccounts()
    })

  if (loadState === 'loading') {
    return <p className="notice">プレイ中表示を読み込み中…</p>
  }
  if (loadState === 'error') {
    return (
      <div className="notice notice--error">
        <p>{loadError}</p>
        <button className="btn" onClick={() => void loadReferenceData()}>
          再読み込み
        </button>
      </div>
    )
  }

  const phase: 'start' | 'finished' | 'ranked_input' | 'lounge_input' | 'confirm' | 'select' =
    !session
      ? 'start'
      : session.status !== 'active'
        ? 'finished'
        : draftRace
          ? session.source === 'ranked'
            ? 'ranked_input'
            : 'lounge_input'
          : resolved
            ? 'confirm'
            : 'select'

  return (
    <div className="playing">
      <div className="playing__head">
        <h2 className="playing__title">プレイ中表示</h2>
        {session && (
          <SessionBadge session={session} vrAccounts={vrAccounts} raceCount={recordedRaces.length} />
        )}
      </div>

      {session && phase !== 'start' && phase !== 'finished' && (
        <StepIndicator step={phase === 'select' ? 1 : phase === 'confirm' ? 2 : 3} />
      )}

      {actionError && <p className="notice notice--error">{actionError}</p>}
      {autoSyncMsg && <p className="notice">{autoSyncMsg}</p>}
      {autoSyncError && <p className="notice notice--warn">{autoSyncError}</p>}

      {phase === 'start' && (
        <SessionStart
          activeSessions={activeSessions}
          vrAccounts={vrAccounts}
          busy={busy}
          onCreate={createSession}
          onResume={resumeSession}
        />
      )}

      {session && phase !== 'start' && (
        <div className="playing__body">
          <section className="panel">
            {phase === 'select' && (
              <CourseSelector
                mapPoints={mapPoints}
                busy={busy}
                onResolve={resolveSelection}
                onMapPointUpdated={handleMapPointUpdated}
              />
            )}
            {phase === 'confirm' && resolved && (
              <SelectionConfirm
                resolved={resolved}
                busy={busy}
                onConfirm={confirmSelection}
                onReselect={cancelSelection}
              />
            )}
            {phase === 'ranked_input' && draftRace && (
              <RankedResultForm
                draftRace={draftRace}
                account={vrAccounts.find(a => a.id === session.vr_account_id) ?? null}
                defaultPlayerCount={session.player_count ?? 12}
                busy={busy}
                courseLabel={
                  draftRace.course_id
                    ? courseName(coursesById.get(draftRace.course_id))
                    : routeName(routesById.get(draftRace.route_id ?? ''), coursesById)
                }
                onComplete={completeRanked}
              />
            )}
            {phase === 'lounge_input' && draftRace && (
              <LoungeResultForm
                draftRace={draftRace}
                session={session}
                lastWarnings={lastWarnings}
                courseLabel={
                  draftRace.course_id
                    ? courseName(coursesById.get(draftRace.course_id))
                    : routeName(routesById.get(draftRace.route_id ?? ''), coursesById)
                }
                busy={busy}
                onComplete={completeLounge}
              />
            )}
            {phase === 'finished' && (
              <div className="finished">
                <p className="finished__msg">
                  {session.source === 'lounge'
                    ? '12レース分の記録が完了しました。マッチ終了として保存されています。'
                    : 'このセッションは終了しました。'}
                </p>
                <button className="btn btn--primary" onClick={() => void leaveSession()}>
                  セッション選択に戻る
                </button>
              </div>
            )}
          </section>

          <aside className="panel">
            <SessionSidebar
              session={session}
              recordedRaces={recordedRaces}
              lastWarnings={lastWarnings}
              coursesById={coursesById}
              routesById={routesById}
              busy={busy}
              canUndo={recordedRaces.length > 0 || draftRace !== null}
              onUndo={undoLastRace}
              onFinish={finishSession}
              disabled={phase === 'finished'}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels: Record<1 | 2 | 3, string> = { 1: 'Target', 2: 'Assist', 3: 'Result' }
  return (
    <div className="step-indicator">
      {([1, 2, 3] as const).map(n => (
        <span
          key={n}
          className={`step-indicator__step${step === n ? ' step-indicator__step--active' : step > n ? ' step-indicator__step--done' : ''}`}
        >
          {labels[n]}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
function SessionBadge({
  session,
  vrAccounts,
  raceCount,
}: {
  session: PlaySession
  vrAccounts: VrAccount[]
  raceCount: number
}) {
  const account = vrAccounts.find(a => a.id === session.vr_account_id)
  const statusLabel =
    session.status === 'active' ? '進行中' : session.status === 'completed' ? '終了' : '中止'
  return (
    <div className="session-badge">
      <span className={`tag tag--${session.source}`}>
        {session.source === 'ranked' ? '野良VR' : 'Lounge'}
      </span>
      {session.source === 'ranked' && account && (
        <span className="session-badge__item">
          {account.display_name} / VR {account.current_vr}
        </span>
      )}
      {session.source === 'lounge' && (
        <span className="session-badge__item">Race {Math.min(raceCount, 12)} / 12</span>
      )}
      <span className={`tag tag--status-${session.status}`}>{statusLabel}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
function SessionStart({
  activeSessions,
  vrAccounts,
  busy,
  onCreate,
  onResume,
}: {
  activeSessions: PlaySession[]
  vrAccounts: VrAccount[]
  busy: string | null
  onCreate: (source: SourceType, playerCount?: number, format?: string) => void
  onResume: (session: PlaySession) => void
}) {
  const [playerCount, setPlayerCount] = useState(12)
  const [format, setFormat] = useState(LOUNGE_FORMATS[0])
  const activeAccount = vrAccounts.find(a => a.is_active)
  const creating = busy === 'create-session'

  return (
    <div className="start">
      {activeSessions.length > 0 && (
        <section className="panel">
          <h3 className="panel__title">進行中のセッションを再開</h3>
          <ul className="session-list">
            {activeSessions.map(s => (
              <li key={s.id} className="session-list__item">
                <span>
                  <span className={`tag tag--${s.source}`}>
                    {s.source === 'ranked' ? '野良VR' : 'Lounge'}
                  </span>
                  <span className="session-list__meta">
                    {s.source === 'lounge' && s.player_count ? `${s.player_count}人 ` : ''}
                    {s.format ?? ''}
                  </span>
                </span>
                <button
                  className="btn"
                  disabled={busy === 'resume'}
                  onClick={() => onResume(s)}
                >
                  再開
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h3 className="panel__title">野良VR を開始</h3>
        {activeAccount ? (
          <p className="start__account">
            現在アカウント: <strong>{activeAccount.display_name}</strong> / VR{' '}
            {activeAccount.current_vr}
          </p>
        ) : (
          <p className="notice notice--warn">
            アクティブな VR アカウントがありません。バックエンドで設定してください。
          </p>
        )}
        <button
          className="btn btn--primary"
          disabled={creating}
          onClick={() => onCreate('ranked')}
        >
          野良VR を開始
        </button>
      </section>

      <section className="panel">
        <h3 className="panel__title">Lounge を開始</h3>
        <div className="field">
          <span className="field__label">参加人数</span>
          <div className="seg">
            {[12, 24].map(n => (
              <button
                key={n}
                className={`seg__btn${playerCount === n ? ' seg__btn--on' : ''}`}
                onClick={() => setPlayerCount(n)}
              >
                {n}人
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">フォーマット</span>
          <div className="seg">
            {LOUNGE_FORMATS.map(f => (
              <button
                key={f}
                className={`seg__btn${format === f ? ' seg__btn--on' : ''}`}
                onClick={() => setFormat(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn--primary"
          disabled={creating}
          onClick={() => onCreate('lounge', playerCount, format)}
        >
          Lounge を開始
        </button>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
function mapPointLabel(mp: MapPoint): string {
  return mp.label_ja
}

function matchesMapPoint(mp: MapPoint, query: string): boolean {
  const q = query.toLowerCase()
  return (
    mp.label_ja.toLowerCase().includes(q) ||
    (mp.label_en?.toLowerCase().includes(q) ?? false) ||
    mp.id.toLowerCase().includes(q) ||
    (mp.course_id?.toLowerCase().includes(q) ?? false)
  )
}

function MapPointPicker({
  id,
  label,
  mapPoints,
  selectedId,
  onSelect,
}: {
  id: string
  label: string
  mapPoints: MapPoint[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => (query ? mapPoints.filter(mp => matchesMapPoint(mp, query)) : mapPoints),
    [mapPoints, query],
  )

  return (
    <div className="mp-picker">
      <label className="field__label" htmlFor={`${id}-search`}>
        {label}
      </label>
      <div className="mp-picker__search">
        <input
          id={`${id}-search`}
          className="input mp-picker__input"
          type="text"
          placeholder="絞り込み…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {selectedId && (
          <button
            className="btn mp-picker__clear"
            onClick={() => { onSelect(''); setQuery('') }}
            aria-label="選択を解除"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mp-picker__list">
        {filtered.length === 0 ? (
          <p className="mp-picker__empty hint">該当なし</p>
        ) : (
          filtered.map(mp => {
            const selected = mp.id === selectedId
            return (
              <button
                key={mp.id}
                className={`mp-picker__item${selected ? ' mp-picker__item--selected' : ''}`}
                onClick={() => onSelect(mp.id)}
                aria-pressed={selected}
              >
                {selected && <span className="mp-picker__badge">選択中</span>}
                <span className="mp-picker__item-ja">{mp.label_ja}</span>
                {mp.label_en && (
                  <span className="mp-picker__item-en">{mp.label_en}</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function CourseSelector({
  mapPoints,
  busy,
  onResolve,
  onMapPointUpdated,
}: {
  mapPoints: MapPoint[]
  busy: string | null
  onResolve: (fromId: string, toId: string) => void
  onMapPointUpdated: (mp: MapPoint) => void
}) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const resolving = busy === 'resolve'

  const fromMp = mapPoints.find(mp => mp.id === fromId)
  const toMp = mapPoints.find(mp => mp.id === toId)
  const samePoint = fromId !== '' && fromId === toId

  const swap = () => {
    const t = fromId
    setFromId(toId)
    setToId(t)
  }

  return (
    <div className="selector">
      <h3 className="panel__title">コース選択</h3>
      <p className="hint">
        出発地点と到着地点を選びます。同じ地点を選ぶと通常3周コース、異なる地点を選ぶと道中コースになります。
      </p>
      <WorldMapPicker
        mapPoints={mapPoints}
        fromId={fromId}
        toId={toId}
        onSelectFrom={setFromId}
        onSelectTo={setToId}
        onMapPointUpdated={onMapPointUpdated}
      />
      <div className="field">
        <MapPointPicker
          id="from-mp"
          label="出発地点"
          mapPoints={mapPoints}
          selectedId={fromId}
          onSelect={setFromId}
        />
      </div>
      <div className="field">
        <MapPointPicker
          id="to-mp"
          label="到着地点"
          mapPoints={mapPoints}
          selectedId={toId}
          onSelect={setToId}
        />
      </div>
      {(fromId || toId) && (
        <div className="selector__summary">
          <span>{fromMp ? mapPointLabel(fromMp) : '—'}</span>
          <span className="selector__arrow">→</span>
          <span>{toMp ? mapPointLabel(toMp) : '—'}</span>
          {fromId && toId && (
            <span className={`tag tag--${samePoint ? 'course' : 'route'}`}>
              {samePoint ? '通常コース' : '道中コース'}
            </span>
          )}
        </div>
      )}
      <div className="btn-row">
        <button
          className="btn"
          disabled={!fromId}
          onClick={() => setToId(fromId)}
        >
          到着を出発と同じにする
        </button>
        <button
          className="btn"
          disabled={!fromId || !toId}
          onClick={swap}
        >
          ⇄ 入れ替え
        </button>
        <button
          className="btn btn--primary"
          disabled={!fromId || !toId || resolving}
          onClick={() => onResolve(fromId, toId)}
        >
          コースを確認
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function SelectionConfirm({
  resolved,
  busy,
  onConfirm,
  onReselect,
}: {
  resolved: ResolveResult
  busy: string | null
  onConfirm: () => void
  onReselect: () => void
}) {
  const recording = busy === 'confirm'
  const targetId = resolved.kind === 'course' ? resolved.course!.id : resolved.route!.id
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [notes, setNotes] = useState<CourseNote[]>([])

  useEffect(() => {
    let cancelled = false
    const params = resolved.kind === 'course' ? { course_id: targetId } : { route_id: targetId }
    Promise.all([api.getMapAnnotations(params), api.getNotes(params)])
      .then(([anns, ns]) => {
        if (cancelled) return
        setAnnotations(anns)
        setNotes(ns.filter(n => n.is_active).sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
          if (a.priority !== b.priority) return b.priority - a.priority
          return b.created_at.localeCompare(a.created_at)
        }))
      })
      .catch(() => {
        if (cancelled) return
        setAnnotations([])
        setNotes([])
      })
    return () => { cancelled = true }
  }, [resolved.kind, targetId])

  return (
    <div className="confirm">
      <h3 className="panel__title">コース確認</h3>
      <p className="confirm__kind">
        <span className={`tag tag--${resolved.kind}`}>
          {resolved.kind === 'course' ? '通常コース' : '道中コース'}
        </span>
        <span className="confirm__name">{resolved.display_name}</span>
      </p>
      <p className="confirm__msg">{resolved.confirm_message}</p>
      {resolved.kind === 'route' && resolved.route && (
        <>
          <TargetImage
            kind="route"
            id={resolved.route.id}
            fallbackCourseId={resolved.route.from_course_id}
            isThreeLap={resolved.route.from_course_id === resolved.route.to_course_id}
            goalReverse={
              (resolved.route.tags as { goal_simple?: string } | null | undefined)?.goal_simple === '逆'
            }
            annotations={annotations}
          />
          <RouteDetail route={resolved.route} />
        </>
      )}
      {resolved.kind === 'course' && resolved.course && (
        <TargetImage kind="course" id={resolved.course.id} annotations={annotations} />
      )}
      {notes.length > 0 && (
        <div className="confirm__notes">
          <div className="confirm__notes-title">ノート ({notes.length})</div>
          <ul className="confirm__notes-list">
            {notes.map(n => (
              <li key={n.id} className="confirm__notes-item">
                <div className="confirm__notes-head">
                  {n.is_pinned && <span className="tag tag--warn">📌</span>}
                  <span className="confirm__notes-name">{n.title ?? '(無題)'}</span>
                </div>
                {n.body_markdown && <div className="confirm__notes-body">{n.body_markdown}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <TargetAssist
        kind={resolved.kind}
        id={targetId}
        displayName={resolved.display_name}
      />
      <div className="btn-row">
        <button className="btn" disabled={recording} onClick={onReselect}>
          選び直す
        </button>
        <button className="btn btn--primary" disabled={recording} onClick={onConfirm}>
          結果を入力する
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function RankedResultForm({
  draftRace,
  account,
  defaultPlayerCount,
  courseLabel,
  busy,
  onComplete,
}: {
  draftRace: RaceRecord
  account: VrAccount | null
  defaultPlayerCount: number
  courseLabel: string
  busy: string | null
  onComplete: (body: CompleteRankedBody) => void
}) {
  const [playerCount, setPlayerCount] = useState(Math.min(24, Math.max(1, defaultPlayerCount || 12)))
  const [placement, setPlacement] = useState(1)
  const [placementHint, setPlacementHint] = useState(false)
  const [ratingAfter, setRatingAfter] = useState(account?.current_vr ?? 0)
  const saving = busy === 'complete-ranked'

  const handlePlayerCountChange = (next: number) => {
    const clamped = Math.min(24, Math.max(1, next || 1))
    setPlayerCount(clamped)
    setPlacement(p => Math.min(p, clamped))
    setPlacementHint(false)
  }

  const currentVr = account?.current_vr ?? null
  const computedDelta = currentVr !== null ? ratingAfter - currentVr : null

  const assistTarget: { kind: 'course' | 'route'; id: string } | null =
    draftRace.course_id
      ? { kind: 'course', id: draftRace.course_id }
      : draftRace.route_id
        ? { kind: 'route', id: draftRace.route_id }
        : null

  return (
    <div className="result">
      <h3 className="panel__title">{courseLabel} の結果</h3>
      <p className="result__race">Race #{draftRace.race_no ?? '-'}（draft）</p>

      <div className="field">
        <span className="field__label">参加人数</span>
        <div className="stepper">
          <button
            className="btn stepper__btn"
            onClick={() => handlePlayerCountChange(playerCount - 1)}
          >
            −
          </button>
          <input
            className="input stepper__input"
            type="number"
            min={1}
            max={24}
            value={playerCount}
            onChange={e => handlePlayerCountChange(Number(e.target.value))}
          />
          <button
            className="btn stepper__btn"
            onClick={() => handlePlayerCountChange(playerCount + 1)}
          >
            ＋
          </button>
        </div>
        <p className="hint">1〜24人で入力できます。</p>
      </div>

      <div className="field">
        <span className="field__label">順位（1〜{playerCount}）</span>
        <div className="stepper">
          <button
            className="btn stepper__btn"
            onClick={() => { setPlacement(p => Math.max(1, p - 1)); setPlacementHint(false) }}
          >
            −
          </button>
          <input
            className="input stepper__input"
            type="number"
            min={1}
            max={playerCount}
            value={placement}
            onChange={e => {
              const n = Number(e.target.value)
              const clamped = Math.min(playerCount, Math.max(1, n || 1))
              setPlacementHint(e.target.value !== '' && n !== clamped)
              setPlacement(clamped)
            }}
          />
          <button
            className="btn stepper__btn"
            onClick={() => { setPlacement(p => Math.min(playerCount, p + 1)); setPlacementHint(false) }}
          >
            ＋
          </button>
        </div>
        {placementHint && (
          <p className="playing__hint--warn">1〜{playerCount}位の範囲で入力してください</p>
        )}
      </div>

      <div className="field">
        <span className="field__label">結果VR</span>
        <div className="stepper">
          <button className="btn stepper__btn" onClick={() => setRatingAfter(v => Math.max(0, v - 1))}>
            −
          </button>
          <input
            className="input stepper__input"
            type="number"
            min={0}
            value={ratingAfter}
            onChange={e => setRatingAfter(Math.max(0, Number(e.target.value) || 0))}
          />
          <button className="btn stepper__btn" onClick={() => setRatingAfter(v => v + 1)}>
            ＋
          </button>
        </div>
      </div>

      <p className="result__vr">
        現在VR: {currentVr ?? '—'}
        {' → '}
        <strong>{ratingAfter}</strong>
        {computedDelta !== null && (
          <span className={computedDelta >= 0 ? 'records__delta--pos' : 'records__delta--neg'}>
            {' '}({computedDelta >= 0 ? '+' : ''}{computedDelta})
          </span>
        )}
      </p>

      {assistTarget && (
        <TargetAssist
          kind={assistTarget.kind}
          id={assistTarget.id}
          displayName={courseLabel}
        />
      )}

      <button
        className="btn btn--primary"
        disabled={saving}
        onClick={() =>
          onComplete({
            player_count: playerCount,
            placement,
            rating_after: ratingAfter,
          })
        }
      >
        保存して次のコースへ
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
function LoungeResultForm({
  draftRace,
  session,
  lastWarnings,
  courseLabel,
  busy,
  onComplete,
}: {
  draftRace: RaceRecord
  session: PlaySession
  lastWarnings: string[]
  courseLabel: string
  busy: string | null
  onComplete: (body: CompleteLoungeBody) => void
}) {
  const [placement, setPlacement] = useState(1)
  const [score, setScore] = useState(LOUNGE_SCORE_TABLE[1] ?? 0)
  const maxPlacement = session.player_count ?? 99
  const saving = busy === 'complete-lounge'

  const handlePlacementChange = (newPlacement: number) => {
    setPlacement(newPlacement)
    const tableScore = LOUNGE_SCORE_TABLE[newPlacement]
    if (tableScore !== undefined) setScore(tableScore)
  }

  const assistTarget: { kind: 'course' | 'route'; id: string } | null =
    draftRace.course_id
      ? { kind: 'course', id: draftRace.course_id }
      : draftRace.route_id
        ? { kind: 'route', id: draftRace.route_id }
        : null

  return (
    <div className="result">
      <h3 className="panel__title">{courseLabel} の結果</h3>
      <p className="result__race">Race #{draftRace.race_no ?? '-'}</p>

      {lastWarnings.length > 0 && (
        <div className="warnbox">
          <p className="warnbox__head">⚠ 警告（記録は完了できます）</p>
          <ul>
            {lastWarnings.map(w => (
              <li key={w}>{WARNING_LABELS[w] ?? w}</li>
            ))}
          </ul>
        </div>
      )}

      {assistTarget && (
        <TargetAssist
          kind={assistTarget.kind}
          id={assistTarget.id}
          displayName={courseLabel}
        />
      )}

      <div className="field">
        <span className="field__label">順位（1〜{maxPlacement}）</span>
        <div className="stepper">
          <button
            className="btn stepper__btn"
            onClick={() => handlePlacementChange(Math.max(1, placement - 1))}
          >
            −
          </button>
          <input
            className="input stepper__input"
            type="number"
            min={1}
            max={maxPlacement}
            value={placement}
            onChange={e => handlePlacementChange(Math.min(maxPlacement, Math.max(1, Number(e.target.value) || 1)))}
          />
          <button
            className="btn stepper__btn"
            onClick={() => handlePlacementChange(Math.min(maxPlacement, placement + 1))}
          >
            ＋
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field__label">スコア</span>
        <div className="stepper">
          <button className="btn stepper__btn" onClick={() => setScore(s => Math.max(0, s - 1))}>
            −
          </button>
          <input
            className="input stepper__input"
            type="number"
            min={0}
            value={score}
            onChange={e => setScore(Math.max(0, Number(e.target.value) || 0))}
          />
          <button className="btn stepper__btn" onClick={() => setScore(s => s + 1)}>
            ＋
          </button>
        </div>
        <p className="hint">順位から自動入力されます。必要なら修正できます。</p>
      </div>

      <button
        className="btn btn--primary"
        disabled={saving}
        onClick={() => onComplete({ placement, score })}
      >
        保存して次のコースへ
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
function SessionSidebar({
  session,
  recordedRaces,
  lastWarnings,
  coursesById,
  routesById,
  busy,
  canUndo,
  disabled,
  onUndo,
  onFinish,
}: {
  session: PlaySession
  recordedRaces: RaceRecord[]
  lastWarnings: string[]
  coursesById: Map<string, Course>
  routesById: Map<string, Route>
  busy: string | null
  canUndo: boolean
  disabled: boolean
  onUndo: () => void
  onFinish: () => void
}) {
  const targetName = (race: RaceRecord) =>
    race.course_id
      ? courseName(coursesById.get(race.course_id))
      : routeName(routesById.get(race.route_id ?? ''), coursesById)

  return (
    <div className="sidebar">
      <h3 className="panel__title">セッション情報</h3>

      {session.source === 'lounge' && (
        <p className="sidebar__progress">Race {Math.min(recordedRaces.length, 12)} / 12</p>
      )}

      {lastWarnings.length > 0 && (
        <div className="warnbox">
          <p className="warnbox__head">⚠ 警告（記録は完了しています）</p>
          <ul>
            {lastWarnings.map(w => (
              <li key={w}>{WARNING_LABELS[w] ?? w}</li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="sidebar__subhead">走行済みコース</h4>
      {recordedRaces.length === 0 ? (
        <p className="hint">まだ記録がありません。</p>
      ) : (
        <ol className="race-history">
          {recordedRaces.map(race => (
            <li key={race.id} className="race-history__item">
              <span className="race-history__no">{race.race_no ?? '-'}</span>
              <span className="race-history__name">{targetName(race)}</span>
              {race.warning_flags && race.warning_flags.length > 0 && (
                <span className="race-history__warn" title={race.warning_flags.join(', ')}>
                  ⚠
                </span>
              )}
              {race.placement != null && (
                <span className="race-history__delta">{race.placement}位</span>
              )}
              {race.score != null && (
                <span className="race-history__delta">{race.score}pt</span>
              )}
              {race.rating_delta !== null && (
                <span className="race-history__delta">
                  {race.rating_delta >= 0 ? `+${race.rating_delta}` : race.rating_delta}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="btn-row btn-row--end">
        <button
          className="btn"
          disabled={disabled || busy === 'undo' || !canUndo}
          onClick={onUndo}
        >
          直前のレースをUndo
        </button>
        <button
          className="btn btn--danger"
          disabled={disabled || busy === 'finish'}
          onClick={onFinish}
        >
          マッチ終了
        </button>
      </div>
    </div>
  )
}
