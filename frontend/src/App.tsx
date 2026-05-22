import { useEffect, useState } from 'react'
import './App.css'

const NAV_ITEMS = ['Dashboard', 'Playing', 'Records', 'Analytics', 'Courses', 'Lounge', 'Settings']

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
        <p className="placeholder">{active}</p>
      </main>
    </div>
  )
}
