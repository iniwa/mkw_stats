import { useEffect, useState } from 'react'
import './App.css'
import AnalyticsView from './AnalyticsView'
import DashboardView from './DashboardView'
import ItemTablesView from './ItemTablesView'
import LoungeHostGuideView from './LoungeHostGuideView'
import LoungeView from './LoungeView'
import NotesView from './NotesView'
import PlayingView from './PlayingView'
import RateOverlayView, { type OverlayMode } from './RateOverlayView'
import RecordsView from './RecordsView'
import SettingsView from './SettingsView'
import StyleguideView from './StyleguideView'
import TimeAttackView from './TimeAttackView'
import VrView from './VrView'

// スタイルガイドは ?view=styleguide で確認可能（NAV からは非表示）。
const NAV_ITEMS = ['Dashboard', 'Playing', 'VR', 'Lounge', 'Host', 'Analytics', 'Items', 'Courses', 'TA', 'Records', 'Settings']

type HealthStatus = 'checking' | 'ok' | 'error'

const _qp = new URLSearchParams(window.location.search)
const _isOverlay = _qp.get('view') === 'overlay'
const _isStyleguide = _qp.get('view') === 'styleguide'
const _rawMode = _qp.get('mode')
const _overlayMode: OverlayMode = (_rawMode === 'vr' || _rawMode === 'mmr' || _rawMode === 'auto' || _rawMode === 'mmr12' || _rawMode === 'mmr24') ? _rawMode : 'vr'
const _compact = _qp.get('compact') === '1'
const _solidBg = _qp.get('bg') === 'solid'

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const [health, setHealth] = useState<HealthStatus>('checking')

  useEffect(() => {
    if (_isOverlay) return
    fetch('/api/v1/health')
      .then(r => (r.ok ? setHealth('ok') : setHealth('error')))
      .catch(() => setHealth('error'))
  }, [])

  if (_isOverlay) {
    return <RateOverlayView initialMode={_overlayMode} compact={_compact} solidBg={_solidBg} />
  }

  if (_isStyleguide) {
    return <StyleguideView />
  }

  return (
    <div className="app">
      <header className="header">
        <span className="title">MKWorld Stats Manager</span>
        <span className={`health health--${health}`}>
          Backend: {health === 'checking' ? '…' : health}
        </span>
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
