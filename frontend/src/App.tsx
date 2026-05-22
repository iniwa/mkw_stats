import { useEffect, useState } from 'react'
import './App.css'
import PlayingView from './PlayingView'
import RecordsView from './RecordsView'
import SettingsView from './SettingsView'

const NAV_ITEMS = ['Dashboard', 'Playing', 'Records', 'Analytics', 'Courses', 'Lounge', 'Settings']

type HealthStatus = 'checking' | 'ok' | 'error'

export default function App() {
  const [active, setActive] = useState('Playing')
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
        {active === 'Playing' ? (
          <PlayingView />
        ) : active === 'Records' ? (
          <RecordsView />
        ) : active === 'Settings' ? (
          <SettingsView />
        ) : (
          <p className="placeholder">{active} はこのスライスでは未実装です。</p>
        )}
      </main>
    </div>
  )
}
