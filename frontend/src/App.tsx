import { useEffect, useState } from 'react'
import './App.css'
import AnalyticsView from './AnalyticsView'
import DashboardView from './DashboardView'
import ItemTablesView from './ItemTablesView'
import LoungeHostGuideView from './LoungeHostGuideView'
import LoungeView from './LoungeView'
import NotesView from './NotesView'
import PlayingView from './PlayingView'
import RecordsView from './RecordsView'
import SettingsView from './SettingsView'
import VrView from './VrView'

const NAV_ITEMS = ['Dashboard', 'Playing', 'VR', 'Lounge', 'Host', 'Analytics', 'Items', 'Courses', 'Records', 'Settings']

type HealthStatus = 'checking' | 'ok' | 'error'

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const [health, setHealth] = useState<HealthStatus>('checking')

  useEffect(() => {
    fetch('/api/v1/health')
      .then(r => (r.ok ? setHealth('ok') : setHealth('error')))
      .catch(() => setHealth('error'))
  }, [])

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
        ) : (
          <p className="placeholder">{active} はこのスライスでは未実装です。</p>
        )}
      </main>
    </div>
  )
}
