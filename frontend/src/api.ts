// Typed client for the MKWorld Stats Manager backend (/api/v1).

export type SourceType = 'ranked' | 'lounge'
export type SessionStatus = 'active' | 'completed' | 'cancelled'
export type RaceStatus = 'draft' | 'completed' | 'cancelled'

export interface Settings {
  id: number
  selected_vr_account_id: string | null
  selected_character_id: string | null
  selected_vehicle_id: string | null
  lounge_player_id: string | null
  lounge_auto_sync: boolean
}

export interface VrAccount {
  id: string
  name: string
  display_name: string
  initial_vr: number
  current_vr: number
  is_active: boolean
  sort_order: number
}

export interface Course {
  id: string
  name_ja: string
  name_en: string | null
  short_name: string | null
  tags: unknown[] | Record<string, unknown> | null
  sort_order: number
  is_active: boolean
}

export interface Route {
  id: string
  from_course_id: string
  to_course_id: string
  name_ja: string | null
  name_en: string | null
  short_name: string | null
  is_lounge_12p_banned: boolean
  repick_group_key: string | null
  tags: unknown[] | Record<string, unknown> | null
  sort_order: number
  is_active: boolean
}

export interface MapPoint {
  id: string
  course_id: string | null
  label_ja: string
  label_en: string | null
  x: number
  y: number
  radius: number | null
}

export interface PlaySession {
  id: string
  source: SourceType
  status: SessionStatus
  title: string | null
  vr_account_id: string | null
  lounge_table_id: string | null
  player_count: number | null
  format: string | null
  started_at: string
  completed_at: string | null
}

export interface RaceRecord {
  id: string
  session_id: string
  source: SourceType
  status: RaceStatus
  race_no: number | null
  course_id: string | null
  route_id: string | null
  player_count: number | null
  placement: number | null
  score: number | null
  is_hidden: boolean
  hidden_at: string | null
  vr_account_id: string | null
  rating_before: number | null
  rating_after: number | null
  rating_delta: number | null
  character_id: string | null
  vehicle_id: string | null
  memo: string | null
  warning_flags: string[] | null
}

export interface ResolveResult {
  kind: 'course' | 'route'
  course: Course | null
  route: Route | null
  display_name: string
  confirm_message: string
}

export interface RaceResponse {
  race: RaceRecord
  warnings: string[]
}

export interface SettingsUpdateBody {
  selected_vr_account_id?: string | null
  lounge_player_id?: string | null
  lounge_auto_sync?: boolean | null
}

export interface VrAccountCreateBody {
  name: string
  display_name: string
  initial_vr: number
  current_vr?: number | null
  sort_order?: number
}

export interface VrAccountUpdateBody {
  display_name?: string
  initial_vr?: number
  current_vr?: number
  sort_order?: number
}

export interface CreateSessionBody {
  source: SourceType
  player_count?: number
  format?: string
}

export interface CompleteRankedBody {
  player_count: number
  placement: number
  rating_after: number
  rating_before?: number | null
  character_id?: string | null
  vehicle_id?: string | null
}

export interface CompleteLoungeBody {
  placement: number
  score: number
}

export interface RaceUpdateBody {
  memo?: string | null
  player_count?: number
  placement?: number
  rating_after?: number
  score?: number
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(`/api/v1${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'バックエンドに接続できませんでした')
  }
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`
    try {
      const body = await resp.json()
      if (typeof body?.detail === 'string') detail = body.detail
      else if (body?.detail) detail = JSON.stringify(body.detail)
    } catch {
      /* keep status-line detail */
    }
    throw new ApiError(resp.status, detail)
  }
  if (resp.status === 204) return undefined as T
  return (await resp.json()) as T
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health'),
  getSettings: () => request<Settings>('/settings'),
  updateSettings: (body: SettingsUpdateBody) =>
    request<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  getVrAccounts: () => request<VrAccount[]>('/vr-accounts'),
  createVrAccount: (body: VrAccountCreateBody) =>
    request<VrAccount>('/vr-accounts', { method: 'POST', body: JSON.stringify(body) }),
  updateVrAccount: (id: string, body: VrAccountUpdateBody) =>
    request<VrAccount>(`/vr-accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  activateVrAccount: (id: string) =>
    request<VrAccount>(`/vr-accounts/${id}/activate`, { method: 'POST' }),
  deleteVrAccount: (id: string) =>
    request<void>(`/vr-accounts/${id}`, { method: 'DELETE' }),
  getSessions: (options?: {
    limit?: number
    status?: SessionStatus
    source?: SourceType
    started_from?: string
    started_to?: string
  }) => {
    const params = new URLSearchParams()
    if (options?.limit !== undefined) params.set('limit', String(options.limit))
    if (options?.status) params.set('status', options.status)
    if (options?.source) params.set('source', options.source)
    if (options?.started_from) params.set('started_from', options.started_from)
    if (options?.started_to) params.set('started_to', options.started_to)
    const qs = params.toString()
    return request<PlaySession[]>(`/play-sessions${qs ? '?' + qs : ''}`)
  },
  getActiveSessions: () => request<PlaySession[]>('/play-sessions/active'),
  getMapPoints: () => request<MapPoint[]>('/map-points'),
  getCourses: () => request<Course[]>('/courses'),
  getRoutes: () => request<Route[]>('/routes'),
  getSession: (id: string) => request<PlaySession>(`/play-sessions/${id}`),
  getSessionRaces: (sessionId: string, includeCancelled = false, includeHidden = false) => {
    const params = new URLSearchParams()
    if (includeCancelled) params.set('include_cancelled', 'true')
    if (includeHidden) params.set('include_hidden', 'true')
    const qs = params.toString()
    return request<RaceRecord[]>(`/play-sessions/${sessionId}/races${qs ? '?' + qs : ''}`)
  },
  createSession: (body: CreateSessionBody) =>
    request<PlaySession>('/play-sessions', { method: 'POST', body: JSON.stringify(body) }),
  resolveSelection: (fromMapPointId: string, toMapPointId: string) =>
    request<ResolveResult>('/course-selection/resolve', {
      method: 'POST',
      body: JSON.stringify({ from_map_point_id: fromMapPointId, to_map_point_id: toMapPointId }),
    }),
  draftRace: (sessionId: string, body: { course_id?: string; route_id?: string }) =>
    request<RaceResponse>(`/play-sessions/${sessionId}/races/draft`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  completeRanked: (raceId: string, body: CompleteRankedBody) =>
    request<RaceRecord>(`/race-records/${raceId}/complete-ranked`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  undoLastRace: (sessionId: string) =>
    request<RaceRecord>(`/play-sessions/${sessionId}/undo-last-race`, { method: 'POST' }),
  updateRaceRecord: (raceId: string, body: RaceUpdateBody) =>
    request<RaceRecord>(`/race-records/${raceId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelRaceRecord: (raceId: string) =>
    request<RaceRecord>(`/race-records/${raceId}/cancel`, { method: 'POST' }),
  completeLounge: (raceId: string, body: CompleteLoungeBody) =>
    request<RaceRecord>(`/race-records/${raceId}/complete-lounge`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  hideRaceRecord: (raceId: string) =>
    request<RaceRecord>(`/race-records/${raceId}/hide`, { method: 'POST' }),
  finishSession: (sessionId: string) =>
    request<PlaySession>(`/play-sessions/${sessionId}/finish`, { method: 'POST' }),
  getNotes: (options?: { course_id?: string; route_id?: string; include_inactive?: boolean }) => {
    const params = new URLSearchParams()
    if (options?.course_id) params.set('course_id', options.course_id)
    if (options?.route_id) params.set('route_id', options.route_id)
    if (options?.include_inactive) params.set('include_inactive', 'true')
    const qs = params.toString()
    return request<CourseNote[]>(`/notes${qs ? '?' + qs : ''}`)
  },
  createNote: (body: CourseNoteCreateBody) =>
    request<CourseNote>('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id: string, body: CourseNoteUpdateBody) =>
    request<CourseNote>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNote: (id: string) =>
    request<void>(`/notes/${id}`, { method: 'DELETE' }),
  getMapAnnotations: (options?: { course_id?: string; route_id?: string; note_id?: string }) => {
    const params = new URLSearchParams()
    if (options?.course_id) params.set('course_id', options.course_id)
    if (options?.route_id) params.set('route_id', options.route_id)
    if (options?.note_id) params.set('note_id', options.note_id)
    const qs = params.toString()
    return request<MapAnnotation[]>(`/map-annotations${qs ? '?' + qs : ''}`)
  },
  createMapAnnotation: (body: MapAnnotationCreateBody) =>
    request<MapAnnotation>('/map-annotations', { method: 'POST', body: JSON.stringify(body) }),
  updateMapAnnotation: (id: string, body: MapAnnotationUpdateBody) =>
    request<MapAnnotation>(`/map-annotations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMapAnnotation: (id: string) =>
    request<void>(`/map-annotations/${id}`, { method: 'DELETE' }),
}

export interface CourseNote {
  id: string
  course_id: string | null
  route_id: string | null
  title: string | null
  body_markdown: string | null
  priority: number
  tags: unknown[] | null
  is_pinned: boolean
  is_active: boolean
  created_at: string
}

export interface CourseNoteCreateBody {
  course_id?: string
  route_id?: string
  title?: string | null
  body_markdown?: string | null
  priority?: number
  tags?: unknown[]
  is_pinned?: boolean
}

export interface CourseNoteUpdateBody {
  title?: string | null
  body_markdown?: string | null
  priority?: number
  tags?: unknown[] | null
  is_pinned?: boolean
}

export const WARNING_LABELS: Record<string, string> = {
  repick: 'リピック（走行済みのコース）',
  route_banned_12p: '12人ラウンジでは道中コース禁止',
}

export type AnnotationType = 'pin' | 'icon' | 'arrow' | 'text' | 'area'

export interface MapAnnotation {
  id: string
  course_id: string | null
  route_id: string | null
  note_id: string | null
  type: AnnotationType
  icon_type: string | null
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  rotation: number | null
  label: string | null
  hover_text: string | null
  priority: number
  style: Record<string, unknown> | null
}

export interface MapAnnotationCreateBody {
  course_id?: string
  route_id?: string
  note_id?: string | null
  type?: AnnotationType
  icon_type?: string | null
  x?: number | null
  y?: number | null
  width?: number | null
  height?: number | null
  rotation?: number | null
  label?: string | null
  hover_text?: string | null
  priority?: number
  style?: Record<string, unknown> | null
}

export interface MapAnnotationUpdateBody {
  note_id?: string | null
  type?: AnnotationType
  icon_type?: string | null
  x?: number | null
  y?: number | null
  width?: number | null
  height?: number | null
  rotation?: number | null
  label?: string | null
  hover_text?: string | null
  priority?: number
  style?: Record<string, unknown> | null
}
