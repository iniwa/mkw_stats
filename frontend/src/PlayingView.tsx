import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  WARNING_LABELS,
  api,
  type CompleteLoungeBody,
  type CompleteRankedBody,
  type Course,
  type CourseNote,
  type CourseNoteCreateBody,
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
import {
  AnnotationEditPanel,
  CourseSelector,
  ItemTablePreview,
  LoungeResultForm,
  MapPointPicker,
  NoteAddPanel,
  RankedResultForm,
  SelectionConfirm,
  SessionBadge,
  SessionSidebar,
  SessionStart,
  StepIndicator,
} from './playing/components'

type LoadState = 'loading' | 'ready' | 'error'

const LOUNGE_FORMATS = ['FFA', '2v2', '3v3', '4v4', '6v6']

// Lounge FFA レース毎スコア配点表。12人部屋と24人部屋で配点が異なる。
// 24p: 合計144 / 12p: 合計82（MK8DX 以来の標準 FFA 配点）。
const LOUNGE_SCORE_TABLE_24P: Readonly<Record<number, number>> = {
  1: 15, 2: 12, 3: 10, 4: 9, 5: 9, 6: 8, 7: 8, 8: 7, 9: 7, 10: 6,
  11: 6, 12: 6, 13: 5, 14: 5, 15: 5, 16: 4, 17: 4, 18: 4, 19: 3, 20: 3,
  21: 3, 22: 2, 23: 2, 24: 1,
}

const LOUNGE_SCORE_TABLE_12P: Readonly<Record<number, number>> = {
  1: 15, 2: 12, 3: 10, 4: 9, 5: 8, 6: 7, 7: 6, 8: 5, 9: 4, 10: 3,
  11: 2, 12: 1,
}

// 参加人数に応じた配点表を返す。12人以下は 12p 表、それ以外（24人）は 24p 表。
function loungeScoreTable(playerCount: number | null | undefined): Readonly<Record<number, number>> {
  return (playerCount ?? 24) <= 12 ? LOUNGE_SCORE_TABLE_12P : LOUNGE_SCORE_TABLE_24P
}

// 1レースあたりの平均(期待値)スコア = 配点合計 ÷ 参加人数。
// これに走行レース数を掛けると「平均的なプレイヤーの目安スコア(par)」になる。
// 24p: 144 / 24 = 6.0、12p: 82 / 12 ≈ 6.83。
function loungeParPerRace(playerCount: number | null | undefined): number {
  const table = loungeScoreTable(playerCount)
  const sum = Object.values(table).reduce((a, b) => a + b, 0)
  const size = playerCount ?? Object.keys(table).length
  return size > 0 ? sum / size : 0
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

function loungeScoreTotal(races: RaceRecord[]): number {
  return races.reduce(
    (sum, race) => sum + (race.status === 'completed' && race.score != null ? race.score : 0),
    0,
  )
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

  const [rankedPlayerCountDraft, setRankedPlayerCountDraft] = useState(12)

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
    setRankedPlayerCountDraft(12)
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
      if (target.source === 'ranked') {
        setRankedPlayerCountDraft(target.player_count ?? 12)
      }
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

  const currentLoungeScore = session?.source === 'lounge' ? loungeScoreTotal(recordedRaces) : 0

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
                source={session.source}
                rankedPlayerCount={rankedPlayerCountDraft}
                onRankedPlayerCountChange={setRankedPlayerCountDraft}
                onResolve={resolveSelection}
                onMapPointUpdated={handleMapPointUpdated}
              />
            )}
            {phase === 'confirm' && resolved && (
              <SelectionConfirm
                resolved={resolved}
                source={session.source}
                loungePlayerCount={session.player_count}
                rankedPlayerCount={rankedPlayerCountDraft}
                onRankedPlayerCountChange={setRankedPlayerCountDraft}
                routes={routes}
                courseMap={coursesById}
                busy={busy}
                onConfirm={confirmSelection}
                onReselect={cancelSelection}
              />
            )}
            {phase === 'ranked_input' && draftRace && (
              <RankedResultForm
                draftRace={draftRace}
                account={vrAccounts.find(a => a.id === session.vr_account_id) ?? null}
                defaultPlayerCount={rankedPlayerCountDraft}
                busy={busy}
                courseLabel={
                  draftRace.course_id
                    ? courseName(coursesById.get(draftRace.course_id))
                    : routeName(routesById.get(draftRace.route_id ?? ''), coursesById)
                }
                routes={routes}
                courseMap={coursesById}
                onComplete={completeRanked}
              />
            )}
            {phase === 'lounge_input' && draftRace && (
              <LoungeResultForm
                draftRace={draftRace}
                session={session}
                lastWarnings={lastWarnings}
                currentTotalScore={currentLoungeScore}
                courseLabel={
                  draftRace.course_id
                    ? courseName(coursesById.get(draftRace.course_id))
                    : routeName(routesById.get(draftRace.route_id ?? ''), coursesById)
                }
                busy={busy}
                routes={routes}
                courseMap={coursesById}
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
              currentLoungeScore={currentLoungeScore}
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
