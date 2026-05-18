import React, { useState, useEffect, useCallback } from 'react'
import { storage, addXP, addNotification, todayStr } from './utils/index.js'

import Onboarding from './components/Onboarding.jsx'
import LandingHome from './landing/LandingHome.jsx'
import LandingFeatures from './landing/LandingFeatures.jsx'
import LandingLogin from './landing/LandingLogin.jsx'
import './landing/landing.css'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dock from './components/Dock.jsx'
import RightPanel from './components/RightPanel.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import NotifPanel from './components/NotifPanel.jsx'
import Home from './components/Home.jsx'

import StudyPlan from './modules/StudyPlan.jsx'
import SyllabusAnalyzer from './modules/SyllabusAnalyzer.jsx'
import MindMap from './modules/MindMap.jsx'
import Notes from './modules/Notes.jsx'
import Flashcards from './modules/Flashcards.jsx'
import MockTest from './modules/MockTest.jsx'
import PYQAnalyzer from './modules/PYQAnalyzer.jsx'
import QuizBlitz from './modules/QuizBlitz.jsx'
import Progress from './modules/Progress.jsx'
import StreakXP from './modules/StreakXP.jsx'
import FocusTimer from './modules/FocusTimer.jsx'
import AITutor from './modules/AITutor.jsx'
import Settings from './modules/Settings.jsx'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error) {
    console.error('App render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-page)', color: 'var(--t-primary)', fontFamily: 'var(--f-body)' }}>
          <div style={{ maxWidth: 520, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 18, padding: 24, boxShadow: 'var(--sh-lg)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ochre)', marginBottom: 10 }}>Something went wrong</div>
            <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--f-display)', fontWeight: 600 }}>The app hit an unexpected error.</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--t-secondary)', lineHeight: 1.7 }}>
              This keeps the page visible instead of going blank. Try reloading the app. If the issue repeats, the last action likely triggered a module render bug.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '0 0 18px', padding: 14, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--b-subtle)', color: 'var(--t-secondary)', fontSize: 12, lineHeight: 1.6 }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </pre>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function NotebookAnimations() {
  return (
    <>
      {/* Slow-drifting pencil SVGs */}
      {[
        { top: '12%', left: '6%', size: 54, delay: 0, dur: 20 },
        { top: '55%', left: '3%', size: 42, delay: 6, dur: 26 },
        { top: '30%', right: '5%', size: 48, delay: 3, dur: 22 },
        { top: '72%', right: '8%', size: 38, delay: 10, dur: 18 },
      ].map((p, i) => (
        <div key={i} className="pencil-float" style={{
          top: p.top, left: p.left, right: p.right,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
        }}>
          <PencilSVG size={p.size} />
        </div>
      ))}

      {/* Drifting small paper shapes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`leaf-${i}`} className="paper-leaf" style={{
          left: `${8 + i * 9}%`,
          width: `${6 + (i % 3) * 4}px`,
          height: `${8 + (i % 4) * 3}px`,
          background: i % 3 === 0
            ? 'rgba(196,115,42,0.18)'
            : i % 3 === 1
            ? 'rgba(90,122,85,0.14)'
            : 'rgba(74,96,128,0.12)',
          '--sway': `${-30 + (i % 5) * 14}px`,
          '--spin': `${80 + i * 28}deg`,
          animationDuration: `${18 + (i * 4.3) % 20}s`,
          animationDelay: `${(i * 2.1) % 16}s`,
          borderRadius: i % 2 === 0 ? '2px' : '50%',
        }} />
      ))}

      {/* Ink drop ripples — very subtle */}
      {[
        { top: '20%', left: '18%', size: 30, delay: 0, dur: 8 },
        { top: '65%', left: '60%', size: 24, delay: 4, dur: 10 },
        { top: '40%', left: '80%', size: 20, delay: 7, dur: 9 },
      ].map((d, i) => (
        <div key={`drop-${i}`} className="ink-drop" style={{
          top: d.top, left: d.left,
          width: d.size, height: d.size,
          marginLeft: -d.size / 2, marginTop: -d.size / 2,
          animationDuration: `${d.dur}s`,
          animationDelay: `${d.delay}s`,
        }} />
      ))}

      {/* Slowly drawing horizontal lines */}
      {[
        { top: '18%', left: '22%', w: 180, delay: 0, dur: 12 },
        { top: '44%', left: '15%', w: 140, delay: 5, dur: 15 },
        { top: '70%', left: '30%', w: 110, delay: 9, dur: 11 },
      ].map((l, i) => (
        <div key={`wl-${i}`} className="write-line" style={{
          top: l.top, left: l.left,
          '--line-w': `${l.w}px`,
          animationDuration: `${l.dur}s`,
          animationDelay: `${l.delay}s`,
        }} />
      ))}
    </>
  )
}

function PencilSVG({ size = 48 }) {
  return (
    <svg width={size} height={size * 3.5} viewBox="0 0 14 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Eraser */}
      <rect x="3" y="0" width="8" height="6" rx="1.5" fill="rgba(200,160,140,0.5)" />
      {/* Ferrule band */}
      <rect x="3" y="6" width="8" height="2.5" fill="rgba(180,140,100,0.4)" />
      {/* Body */}
      <rect x="3" y="8.5" width="8" height="32" fill="rgba(196,115,42,0.22)" />
      {/* Wood tip */}
      <polygon points="3,40.5 11,40.5 7,50" fill="rgba(160,120,80,0.3)" />
      {/* Graphite tip */}
      <polygon points="5.5,46 8.5,46 7,50" fill="rgba(100,80,60,0.4)" />
      {/* Shine line */}
      <line x1="5" y1="9" x2="5" y2="40" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </svg>
  )
}

export default function App() {
  const [profile, setProfile] = useState(storage.get('profile', null))
  const [landingScreen, setLandingScreen] = useState(storage.get('profile', null) ? 'app' : 'home')
  const [activeModule, setActiveModule] = useState(null)
  const [showCommand, setShowCommand] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [moduleKey, setModuleKey] = useState(0)

  const notifs = storage.get('notifications', [])
  const unreadCount = notifs.filter(n => !n.read).length

  useEffect(() => {
    const lastLogin = storage.get('last_login')
    const today = todayStr()
    if (lastLogin !== today && profile) {
      storage.set('last_login', today)
      addXP('login')
      addNotification(`Welcome back, ${profile.name}! +5 XP for daily login`, '⭐')
    }
  }, [profile])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowCommand(p => !p) }
      if (e.key === 'Escape') { setShowCommand(false); setShowNotif(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navigate = useCallback((id) => {
    setActiveModule(id)
    setModuleKey(k => k + 1)
  }, [])

  const handleProfileUpdate = (p) => setProfile(p)

  const handleLogout = () => {
    storage.remove('profile')
    setProfile(null)
    setActiveModule(null)
    setLandingScreen('home')
  }

  // ── Landing flow: home → features → login → onboarding → app
  if (landingScreen === 'home')
    return <LandingHome
      onFeatures={() => setLandingScreen('features')}
      onLogin={() => setLandingScreen('login')}
    />

  if (landingScreen === 'features')
    return <LandingFeatures
      onHome={() => setLandingScreen('home')}
      onLogin={() => setLandingScreen('login')}
    />

  if (landingScreen === 'login')
    return <LandingLogin
      onHome={() => setLandingScreen('home')}
      onSetup={() => setLandingScreen('setup')}
    />

  if (landingScreen === 'setup' && !profile)
    return <Onboarding onComplete={(p) => { setProfile(p); setLandingScreen('app') }} />

  const renderModule = () => {
    const props = { profile, onNavigate: navigate }
    switch (activeModule) {
      case 'studyplan':  return <StudyPlan {...props} />
      case 'syllabus':   return <SyllabusAnalyzer {...props} />
      case 'mindmap':    return <MindMap {...props} />
      case 'notes':      return <Notes {...props} />
      case 'flashcards': return <Flashcards {...props} />
      case 'mocktest':   return <MockTest {...props} />
      case 'pyq':        return <PYQAnalyzer {...props} />
      case 'quiz':       return <QuizBlitz {...props} />
      case 'progress':   return <Progress {...props} />
      case 'streak':     return <StreakXP {...props} />
      case 'focus':      return <FocusTimer {...props} />
      case 'chat':       return <AITutor {...props} />
      case 'settings':   return <Settings {...props} onProfileUpdate={handleProfileUpdate} />
      default:           return <Home profile={profile} onNavigate={navigate} />
    }
  }

  return (
    <AppErrorBoundary>
      {/* Notebook background */}
      <div className="notebook-bg">
        <div className="notebook-lines" />
        <div className="notebook-margin" />
        <div className="notebook-vignette" />
        <div className="stationery-layer">
          {/* Floating pencils */}
          <NotebookAnimations />
        </div>
      </div>

      <div id="loading-bar" className="loading-bar" style={{ display: 'none' }} />
      <div id="toast-container" className="toast-container" />

      {showCommand && <CommandPalette onNavigate={navigate} onClose={() => setShowCommand(false)} />}

      <div className="app-shell">
        <TopBar
          profile={profile}
          onSearch={() => setShowCommand(true)}
          onNotifClick={() => setShowNotif(p => !p)}
          notifCount={unreadCount}
          activeModule={activeModule}
          onLogout={handleLogout}
          onNavigate={navigate}
        />

        {showNotif && (
          <div style={{ position: 'fixed', top: 56, right: 20, zIndex: 500 }}>
            <NotifPanel onClose={() => setShowNotif(false)} />
          </div>
        )}

        <Sidebar activeModule={activeModule} onNavigate={navigate} />

        <main className="main-stage">
          <div
            key={moduleKey}
            className="module-container module-enter module-enter-active"
            style={{ animation: 'moduleIn 0.2s ease forwards' }}
          >
            {renderModule()}
          </div>
        </main>

        <RightPanel profile={profile} />
        <Dock activeModule={activeModule} onNavigate={navigate} />
      </div>

      <style>{`
        @keyframes moduleIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </AppErrorBoundary>
  )
}
