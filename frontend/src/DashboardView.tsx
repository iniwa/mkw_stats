import { useCallback, useEffect, useState } from 'react'
import {
  api,
  type Course,
  type CourseNote,
  type MapAnnotation,
  type PlaySession,
  type Route,
  type Settings,
  type VrAccount,
} from './api'

interface DashboardData {
  vrAccounts: VrAccount[]
  activeSessions: PlaySession[]
  recentSessions: PlaySession[]
  loungeSessions: PlaySession[]
  courses: Course[]
  routes: Route[]
  notes: CourseNote[]
  annotations: MapAnnotation[]
  settings: Settings | null
}

interface Props {
  onNavigate: (view: string) => void
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sessionLabel(s: PlaySession): string {
  if (s.title) return s.title
  const base = s.source === 'ranked' ? 'Ranked' : 'Lounge'
  return s.format ? `${base} ${s.format}` : base
}

function statusLabel(status: string): string {
  if (status === 'active') return '進行中'
  if (status === 'completed') return '完了'
  if (status === 'cancelled') return 'キャンセル'
  return status
}

export default function DashboardView({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.getVrAccounts(),
      api.getActiveSessions(),
      api.getSessions({ limit: 5 }),
      api.getSessions({ source: 'lounge', limit: 5 }),
      api.getCourses(),
      api.getRoutes(),
      api.getNotes(),
      api.getMapAnnotations(),
      api.getSettings().catch((): Settings | null => null),
    ])
      .then(([vrAccounts, activeSessions, recentSessions, loungeSessions, courses, routes, notes, annotations, settings]) => {
        setData({ vrAccounts, activeSessions, recentSessions, loungeSessions, courses, routes, notes, annotations, settings })
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="placeholder">読み込み中...</p>
  if (error || !data) {
    return (
      <div className="dashboard">
        <p className="notice notice--error">{error ?? '読み込みに失敗しました'}</p>
        <div className="btn-row">
          <button className="btn" onClick={load}>再試行</button>
        </div>
      </div>
    )
  }

  const activeAccount = data.vrAccounts.find(a => a.is_active) ?? null
  const activeCourses = data.courses.filter(c => c.is_active).length
  const activeRoutes = data.routes.filter(r => r.is_active).length
  const activeNotes = data.notes.filter(n => n.is_active).length
  const annotationCount = data.annotations.length
  const activeLoungeCount = data.activeSessions.filter(s => s.source === 'lounge').length
  const latestLounge = data.loungeSessions[0] ?? null
  const latestLoungeLabel = latestLounge
    ? `${latestLounge.player_count ? `${latestLounge.player_count}人 ` : ''}${statusLabel(latestLounge.status)}`
    : '—'

  return (
    <div className="dashboard">
      <div className="dashboard__grid">
        <div className="panel">
          <div className="panel__title">VRアカウント</div>
          {activeAccount ? (
            <div className="dashboard__vr-account">
              <div className="dashboard__vr-name">{activeAccount.display_name}</div>
              <div className="dashboard__vr-value">{activeAccount.current_vr.toLocaleString()}</div>
              <div className="dashboard__vr-sub">@{activeAccount.name}</div>
            </div>
          ) : (
            <p className="dashboard__vr-empty">アクティブなアカウントがありません</p>
          )}
        </div>

        <div className="panel">
          <div className="panel__title">進行中のセッション</div>
          {data.activeSessions.length === 0 ? (
            <p className="placeholder" style={{ fontSize: '0.85rem' }}>セッションはありません</p>
          ) : (
            <ul className="dashboard__session-list">
              {data.activeSessions.map(s => (
                <li key={s.id} className="dashboard__session-item">
                  <div className="dashboard__session-row1">
                    <span className={`tag tag--${s.source}`}>
                      {s.source === 'ranked' ? 'Ranked' : 'Lounge'}
                    </span>
                    <span className={`tag tag--status-${s.status}`}>{statusLabel(s.status)}</span>
                    <span className="dashboard__session-title">{sessionLabel(s)}</span>
                    <span className="dashboard__session-time">{fmtTime(s.started_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">ライブラリ</div>
        <div className="dashboard__metrics">
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{activeCourses}</div>
            <div className="dashboard__metric-label">コース</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{activeRoutes}</div>
            <div className="dashboard__metric-label">ルート</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{activeNotes}</div>
            <div className="dashboard__metric-label">ノート</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{annotationCount}</div>
            <div className="dashboard__metric-label">アノテーション</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Lounge</div>
        <div className="dashboard__metrics">
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{data.settings?.lounge_mmr_12p ?? '—'}</div>
            <div className="dashboard__metric-label">12p MMR</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{data.settings?.lounge_mmr_24p ?? '—'}</div>
            <div className="dashboard__metric-label">24p MMR</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{activeLoungeCount}</div>
            <div className="dashboard__metric-label">進行中</div>
          </div>
          <div className="dashboard__metric">
            <div className="dashboard__metric-value">{data.settings?.lounge_auto_sync ? 'ON' : 'OFF'}</div>
            <div className="dashboard__metric-label">自動同期</div>
          </div>
        </div>
        <div className="dashboard__session-row2">
          Player: {data.settings?.lounge_player_id || '未設定'} / Season {data.settings?.lounge_season ?? '—'} / 最新: {latestLoungeLabel}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">最近のセッション</div>
        {data.recentSessions.length === 0 ? (
          <p className="placeholder" style={{ fontSize: '0.85rem' }}>セッションはありません</p>
        ) : (
          <ul className="dashboard__session-list">
            {data.recentSessions.map(s => (
              <li key={s.id} className="dashboard__session-item">
                <div className="dashboard__session-row1">
                  <span className={`tag tag--${s.source}`}>
                    {s.source === 'ranked' ? 'Ranked' : 'Lounge'}
                  </span>
                  <span className={`tag tag--status-${s.status}`}>{statusLabel(s.status)}</span>
                  <span className="dashboard__session-title">{sessionLabel(s)}</span>
                  <span className="dashboard__session-time">{fmtTime(s.started_at)}</span>
                </div>
                {s.completed_at && (
                  <div className="dashboard__session-row2">完了: {fmtTime(s.completed_at)}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel__title">クイックアクション</div>
        <div className="dashboard__actions">
          {(['Playing', 'Lounge', 'Host', 'Records', 'Courses', 'Settings'] as const).map(view => (
            <button key={view} className="btn" onClick={() => onNavigate(view)}>
              {view}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
