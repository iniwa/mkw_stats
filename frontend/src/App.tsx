import { useEffect, useState } from 'react'
import './App.css'
import AnalyticsView from './AnalyticsView'
import DashboardView from './DashboardView'
import ItemTablesView from './ItemTablesView'
import LoungeHostGuideView from './LoungeHostGuideView'
import LoungeView from './LoungeView'
import NotesView from './NotesView'
import PlayingView from './PlayingView'
import RateOverlayView, { normalizeOverlayPollMs, type OverlayMode } from './RateOverlayView'
import RecordsView from './RecordsView'
import SettingsView from './SettingsView'
import StyleguideView from './StyleguideView'
import TimeAttackView from './TimeAttackView'
import VrView from './VrView'
import { api } from './api'

// スタイルガイドは ?view=styleguide で確認可能（NAV からは非表示）。
const NAV_ITEMS = ['Dashboard', 'Playing', 'VR', 'Lounge', 'Host', 'Analytics', 'Items', 'Courses', 'TA', 'Records', 'Settings']

type ReadinessState = 'checking' | 'ready' | 'database-error' | 'error'

const _qp = new URLSearchParams(window.location.search)
const _isOverlay = _qp.get('view') === 'overlay'
const _isStyleguide = _qp.get('view') === 'styleguide'
const _rawMode = _qp.get('mode')
const _overlayMode: OverlayMode = (_rawMode === 'vr' || _rawMode === 'mmr' || _rawMode === 'auto' || _rawMode === 'mmr12' || _rawMode === 'mmr24') ? _rawMode : 'vr'
const _compact = _qp.get('compact') === '1'
const _solidBg = _qp.get('bg') === 'solid'
const _overlayPollMs = normalizeOverlayPollMs(_qp.get('pollMs') ?? _qp.get('poll'))

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const [readiness, setReadiness] = useState<ReadinessState>('checking')
  const [checking, setChecking] = useState(false)
  const [readinessCheck, setReadinessCheck] = useState(0)

  useEffect(() => {
    if (_isOverlay || _isStyleguide) return

    let mounted = true
    let inFlight = false
    let requestId = 0
    let controller: AbortController | null = null
    let timeout: number | null = null

    const checkReadiness = () => {
      if (inFlight) return
      inFlight = true
      const currentRequest = ++requestId
      const requestController = new AbortController()
      controller = requestController
      timeout = window.setTimeout(() => requestController.abort(), 5000)
      if (mounted) {
        setChecking(true)
        setReadiness('checking')
      }

      api.getReadiness(requestController.signal)
        .then(status => {
          if (mounted && currentRequest === requestId) setReadiness(status)
        })
        .catch(() => {
          if (!mounted || currentRequest !== requestId) return
          setReadiness('error')
        })
        .finally(() => {
          if (timeout !== null) {
            window.clearTimeout(timeout)
            timeout = null
          }
          if (currentRequest === requestId) {
            inFlight = false
            controller = null
            if (mounted) setChecking(false)
          }
        })
    }

    checkReadiness()
    const interval = window.setInterval(checkReadiness, 30_000)
    return () => {
      mounted = false
      requestId += 1
      window.clearInterval(interval)
      if (timeout !== null) {
        window.clearTimeout(timeout)
        timeout = null
      }
      controller?.abort()
    }
  }, [readinessCheck])

  if (_isOverlay) {
    return <RateOverlayView initialMode={_overlayMode} compact={_compact} solidBg={_solidBg} pollMs={_overlayPollMs} />
  }

  if (_isStyleguide) {
    return <StyleguideView />
  }

  return (
    <div className="app">
      <header className="header">
        <span className="title">MKWorld Stats Manager</span>
        <div className="header__status">
          <span className={`health health--${readiness}`}>
            {readiness === 'checking' ? 'Backend を確認中…' : readiness === 'ready' ? 'Backend・DB 正常' : readiness === 'database-error' ? 'DB を利用できません' : 'Backend の状態を確認できません'}
          </span>
          <button className="health__retry" type="button" onClick={() => setReadinessCheck(check => check + 1)} disabled={checking} title="状態を再確認">
            再確認
          </button>
        </div>
      </header>
      <nav className="nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item}
            className={`nav-btn${active === item ? ' nav-btn--active' : ''}`}
            onClick={() => setActive(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <main className="main">
        {active === 'Dashboard' ? (
          <DashboardView onNavigate={setActive} />
        ) : active === 'Playing' ? (
          <PlayingView />
        ) : active === 'Records' ? (
          <RecordsView />
        ) : active === 'VR' ? (
          <VrView />
        ) : active === 'Analytics' ? (
          <AnalyticsView />
        ) : active === 'Lounge' ? (
          <LoungeView />
        ) : active === 'Settings' ? (
          <SettingsView />
        ) : active === 'Host' ? (
          <LoungeHostGuideView />
        ) : active === 'Items' ? (
          <ItemTablesView />
        ) : active === 'Courses' ? (
          <NotesView />
        ) : active === 'TA' ? (
          <TimeAttackView />
        ) : (
          <p className="placeholder">{active} はこのスライスでは未実装です。</p>
        )}
      </main>
    </div>
  )
}
