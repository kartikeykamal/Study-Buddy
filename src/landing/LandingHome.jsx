import React from 'react'

const STRIP_ITEMS = [
  { icon: '📋', label: 'Study Plan' },
  { icon: '🤖', label: 'AI Tutor' },
  { icon: '🗺️', label: 'Mind Map' },
  { icon: '📝', label: 'Mock Tests' },
  { icon: '⚡', label: 'Quiz Blitz' },
  { icon: '⏱️', label: 'Focus Timer' },
]

const TESTIMONIALS = [
  {
    quote: '"Finally an app that feels like it was built for how I actually study. The AI study plan alone saved me weeks of planning."',
    name: 'Arjun S.', sub: 'JEE Advanced 2025 — AIR 412',
    initial: 'A', color: 'rgba(196,115,42,0.12)', tc: '#c4732a',
  },
  {
    quote: '"The mock tests are scarily accurate to the real exam. I went from 60% to 89% accuracy in six weeks using StudyBuddy."',
    name: 'Priya M.', sub: 'NEET 2025 — 680/720',
    initial: 'P', color: 'rgba(90,122,85,0.12)', tc: '#5a7a55',
  },
  {
    quote: '"AI Tutor explains things at 2am when no one else can. It knows my syllabus and gives me answers that actually make sense."',
    name: 'Rahul K.', sub: 'UPSC Prelims 2025',
    initial: 'R', color: 'rgba(74,96,128,0.12)', tc: '#4a6080',
  },
]

export default function LandingHome({ onFeatures, onLogin }) {
  return (
    <div className="l-page-root">

      {/* NAV */}
      <nav className="l-nav">
        <div className="l-nav-inner">
          <div className="l-logo">StudyBuddy<span className="l-logo-dot">·</span></div>
          <div className="l-nav-links">
            <span onClick={onFeatures} className="l-nav-link">Features</span>
            <button onClick={onLogin} className="l-btn-nav">Get Started →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="l-hero-section">
        <div className="l-ruled-bg" />
        <div className="l-margin-line" />

        <div className="l-hero-wrap">
          <div className="l-hero-inner">
            <div className="l-hero-tag">
              <span className="l-hero-tag-dot" />
              AI-powered learning platform
            </div>

            <h1 className="l-hero-title">
              Study smarter.<br />
              Score <em>higher.</em>
            </h1>

            <p className="l-hero-sub">
              StudyBuddy brings together AI tutoring, adaptive study plans, smart flashcards,
              timed mock tests, and deep focus tools — built around how students actually prepare for exams.
            </p>

            <div className="l-hero-cta">
              <button onClick={onLogin} className="l-btn-primary">
                Start for free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button onClick={onFeatures} className="l-btn-ghost">See all features</button>
            </div>

            <div className="l-stat-row">
              <div className="l-stat-item">
                <span className="l-stat-num">12+</span>
                <span className="l-stat-label">AI Tools</span>
              </div>
              <div className="l-stat-divider" />
              <div className="l-stat-item">
                <span className="l-stat-num">100%</span>
                <span className="l-stat-label">Free to use</span>
              </div>
              <div className="l-stat-divider" />
              <div className="l-stat-item">
                <span className="l-stat-num">∞</span>
                <span className="l-stat-label">Practice tests</span>
              </div>
            </div>
          </div>

          {/* hero mockup card */}
          <div className="l-hero-card">
            <div className="l-mock-bar">
              <div className="l-mock-dot" style={{background:'#e57373'}}/>
              <div className="l-mock-dot" style={{background:'#ffb74d'}}/>
              <div className="l-mock-dot" style={{background:'#81c784'}}/>
              <span className="l-mock-title">StudyBuddy<span style={{color:'#c4732a'}}>·</span></span>
            </div>
            <div className="l-mock-body">
              <div className="l-mock-sidebar">
                <div className="l-mock-logo">SB<span style={{color:'#c4732a'}}>·</span></div>
                <div className="l-mock-sec-lbl">Learn</div>
                <div className="l-mock-nav l-mock-nav-active">Study Plan</div>
                <div className="l-mock-nav">Syllabus AI</div>
                <div className="l-mock-nav">Mind Map</div>
                <div className="l-mock-nav">Notes</div>
                <div className="l-mock-sec-lbl" style={{marginTop:8}}>Practice</div>
                <div className="l-mock-nav">Mock Test</div>
                <div className="l-mock-nav">Quiz Blitz</div>
                <div className="l-mock-sec-lbl" style={{marginTop:8}}>Track</div>
                <div className="l-mock-nav">Progress</div>
              </div>
              <div className="l-mock-main">
                <div className="l-mock-hero-card">
                  <div className="l-mock-ruled"/>
                  <div className="l-mock-margin"/>
                  <div className="l-mock-date">Thursday, May 1, 2026</div>
                  <div className="l-mock-greeting">Good morning, Scholar <span style={{color:'#c4732a'}}>✦</span></div>
                  <div className="l-mock-quote">"Every page you turn is a step closer."</div>
                </div>
                <div className="l-mock-grid">
                  {[
                    {label:'Study Plan', color:'rgba(196,115,42,0.22)'},
                    {label:'AI Tutor', color:'rgba(90,122,85,0.22)'},
                    {label:'Syllabus', color:'rgba(74,96,128,0.22)'},
                    {label:'Mock Test', color:'rgba(138,90,90,0.18)'},
                    {label:'Flashcards', color:'rgba(196,115,42,0.14)'},
                    {label:'Quiz Blitz', color:'rgba(74,96,128,0.14)'},
                  ].map(({label,color}) => (
                    <div key={label} className="l-mock-tile" style={{borderColor:color}}>
                      <div style={{width:10,height:10,borderRadius:3,background:color}}/>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <div className="l-feature-strip">
        <div className="l-strip-inner">
          {STRIP_ITEMS.map(({icon, label}) => (
            <div key={label} className="l-strip-item">
              <div className="l-strip-icon">{icon}</div>
              <span className="l-strip-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section className="l-social-section">
        <div className="l-social-inner">
          <p className="l-social-label">✦ &nbsp; Loved by students across India &nbsp; ✦</p>
          <div className="l-testimonials">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="l-testimonial">
                <p className="l-t-quote">{t.quote}</p>
                <div className="l-t-author">
                  <div className="l-t-avatar" style={{background: t.color, color: t.tc}}>{t.initial}</div>
                  <div>
                    <div className="l-t-name">{t.name}</div>
                    <div className="l-t-sub">{t.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="l-cta-banner">
        <div className="l-cta-pattern" />
        <div className="l-cta-accent-line" />
        <div className="l-cta-inner">
          <div className="l-cta-tag">
            <span className="l-hero-tag-dot" />
            Free to get started
          </div>
          <h2 className="l-cta-title">
            Your exam is closer<br/>than you think. <em>Start now.</em>
          </h2>
          <p className="l-cta-sub">
            Set up your exam, upload your syllabus, and let AI build your personalized study plan in under 2 minutes.
          </p>
          <button onClick={onLogin} className="l-btn-primary-inv">
            Create your study plan
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p className="l-cta-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            No account required to explore · Your data stays private
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div>
            <div className="l-logo">StudyBuddy<span className="l-logo-dot">·</span></div>
            <p className="l-footer-text">Built for serious students. Powered by AI.</p>
          </div>
          <div className="l-footer-links">
            <span onClick={onFeatures}>Features</span>
            <span onClick={onLogin}>Sign In</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
