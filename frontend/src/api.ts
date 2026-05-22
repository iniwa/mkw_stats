// Typed client for the MKWorld Stats Manager backend (/api/v1).

export type SourceType = 'ranked' | 'lounge'
export type SessionStatus = 'active' | 'completed' | 'cancelled'
export type RaceStatus = 'draft' | 'completed' | 'cancelled'
export type PlacementBand = 'top' | 'middle' | 'bottom'

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
  tags: unknown[] | null
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
  tags: unknown[] | null
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
  placement_band: PlacementBand | null
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

export interface CreateSessionBody {
  source: SourceType
  player_count?: number
  format?: string
}

export interface CompleteRankedBody {
  player_count: number
  placement_band: PlacementBand
  rating_delta: number
  memo?: string
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
  getVrAccounts: () => request<VrAccount[]>('/vr-accounts'),
  getActiveSessions: () => request<PlaySession[]>('/play-sessions/active'),
  getMapPoints: () => request<MapPoint[]>('/map-points'),
  getCourses: () => request<Course[]>('/courses'),
  getRoutes: () => request<Route[]>('/routes'),
  getSession: (id: string) => request<PlaySession>(`/play-sessions/${id}`),
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
  finishSession: (sessionId: string) =>
    request<PlaySession>(`/play-sessions/${sessionId}/finish`, { method: 'POST' }),
}

export const WARNING_LABELS: Record<string, string> = {
  repick: 'リピック（走行済みのコース）',
  route_banned_12p: '12人ラウンジでは道中コース禁止',
}
