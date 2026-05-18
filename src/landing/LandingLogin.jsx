import React, { useState } from 'react'

const FEATURES = [
  { icon: '📋', color: '#c4732a', title: 'AI Study Plan', desc: 'Personalized daily schedule for your exam' },
  { icon: '💬', color: '#5a7a55', title: 'AI Tutor', desc: 'Ask anything, get step-by-step answers' },
  { icon: '⚡', color: '#4a6080', title: 'Mock Tests & Quizzes', desc: 'Practice with exam-pattern questions' },
  { icon: '🔥', color: '#c4732a', title: 'Streaks & Progress', desc: 'Stay consistent, track everything' },
]

export default function LandingLogin({ onHome, onSetup }) {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // For this app, login just goes straight to setup/onboarding
    onSetup()
  }

  return (
    <div className="l-page-root">
      <div className="l-login-layout">

        {/* LEFT PANEL */}
        <div className="l-login-left">
          <div className="l-ruled-bg" />
          <div className="l-margin-line" />
          <div className="l-login-left-inner">
            <span onClick={onHome} className="l-logo l-login-logo" style={{ cursor: 'pointer' }}>
              StudyBuddy<span className="l-logo-dot">·</span>
            </span>

            <div className="l-login-tagline">
              <p className="l-login-quote">
                "The secret of getting ahead is getting started."
              </p>
            </div>

            <div className="l-login-features">
              {FEATURES.map(f => (
                <div key={f.title} className="l-login-feat-item">
                  <div className="l-lf-icon" style={{ borderColor: `${f.color}30` }}>
                    <span style={{ fontSize: 14 }}>{f.icon}</span>
                  </div>
                  <div>
                    <div className="l-lf-title">{f.title}</div>
                    <div className="l-lf-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="l-login-bottom-note">
              ℹ Your data stays private
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="l-login-right">
          <div className="l-login-card">
            <div className="l-login-card-header">
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 22, borderBottom: '1px solid rgba(160,140,110,0.18)' }}>
                {[['signin','Sign in'],['signup','Create account']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    flex: 1, padding: '8px 0', background: 'none', border: 'none',
                    fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: tab === key ? 600 : 400,
                    color: tab === key ? '#2c2416' : '#8a7a62',
                    cursor: 'pointer',
                    borderBottom: tab === key ? '2px solid #c4732a' : '2px solid transparent',
                    marginBottom: -1, transition: 'all 0.15s',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              <p className="l-login-card-sub">
                {tab === 'signin'
                  ? 'Continue your study session'
                  : 'Set up your study profile in 60 seconds'}
              </p>
            </div>

            <form className="l-login-form" onSubmit={handleSubmit}>
              {tab === 'signup' && (
                <div className="l-form-group">
                  <label className="l-form-label">Your name</label>
                  <div className="l-input-wrap">
                    <svg className="l-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                    <input type="text" className="l-form-input" placeholder="e.g. Kartikey"
                      value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="l-form-group">
                <label className="l-form-label">Email address</label>
                <div className="l-input-wrap">
                  <svg className="l-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input type="email" className="l-form-input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="l-form-group">
                <label className="l-form-label">Password</label>
                <div className="l-input-wrap">
                  <svg className="l-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" className="l-form-input" placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {tab === 'signin' && (
                  <div className="l-form-hint">
                    <span className="l-form-link" style={{ cursor: 'pointer' }}>Forgot password?</span>
                  </div>
                )}
              </div>

              <button type="submit" className="l-btn-submit">
                {tab === 'signin' ? 'Sign in' : 'Create account & set up →'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              <div className="l-form-divider"><span>or</span></div>

              <button type="button" className="l-btn-oauth" onClick={onSetup}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4A90D9"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#5a7a55"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#c4732a"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#8a5a5a"/></svg>
                Continue with Google
              </button>

              <p className="l-login-switch">
                {tab === 'signin' ? 'New to StudyBuddy? ' : 'Already have an account? '}
                <span className="l-form-link" style={{ cursor: 'pointer' }}
                  onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}>
                  {tab === 'signin' ? 'Create an account' : 'Sign in'}
                </span>
              </p>
            </form>
          </div>

          <div className="l-login-back">
            <span onClick={onHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--t-muted)', fontFamily: "'Inter', sans-serif" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to home
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
