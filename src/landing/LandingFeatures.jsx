import React from 'react'

const FEATURES_LEARN = [
  { wide: true, icon: '📋', color: '#c4732a', cdim: 'rgba(196,115,42,0.09)', cb: 'rgba(196,115,42,0.22)',
    title: 'Study Plan', tags: ['AI-generated','Exam-aware','Adaptive'],
    desc: 'Your AI generates a day-by-day, subject-by-subject study schedule tailored to your exam date, weak areas, and available time — then adapts as you progress.',
    preview: 'calendar' },
  { icon: '📚', color: '#4a6080', cdim: 'rgba(74,96,128,0.09)', cb: 'rgba(74,96,128,0.22)',
    title: 'Syllabus Analyser', tags: ['PDF upload','Topic mapping'],
    desc: 'Upload your syllabus PDF and instantly get a structured topic breakdown with weightage insights and study priority scores.' },
  { icon: '🗺️', color: '#5a7a55', cdim: 'rgba(90,122,85,0.09)', cb: 'rgba(90,122,85,0.22)',
    title: 'Mind Map', tags: ['Visual learning','AI-generated'],
    desc: 'Visualize entire topics as interactive mind maps. AI-generated or manually built — connect concepts, see the big picture.' },
  { icon: '✏️', color: '#c4732a', cdim: 'rgba(196,115,42,0.09)', cb: 'rgba(196,115,42,0.22)',
    title: 'Notes Studio', tags: ['Rich editor','AI summaries'],
    desc: 'A distraction-free notebook with rich text, image paste, and AI-powered summaries. Your notes, structured automatically.' },
  { icon: '🃏', color: '#5a7a55', cdim: 'rgba(90,122,85,0.09)', cb: 'rgba(90,122,85,0.22)',
    title: 'Flashcards', tags: ['Spaced repetition','Auto-generated'],
    desc: 'Spaced repetition flashcards generated from your notes or syllabus. Review at the optimal moment — not too early, not too late.' },
]

const FEATURES_PRACTICE = [
  { wide: true, icon: '📝', color: '#c4732a', cdim: 'rgba(196,115,42,0.09)', cb: 'rgba(196,115,42,0.22)',
    title: 'Mock Test', tags: ['Timed','Exam-pattern','Detailed analytics'],
    desc: 'Full-length, timed mock exams that mirror your actual exam pattern. Get detailed analytics on every section — marks, time, accuracy, and topic gaps.',
    preview: 'test' },
  { icon: '📄', color: '#8a5a5a', cdim: 'rgba(138,90,90,0.09)', cb: 'rgba(138,90,90,0.22)',
    title: 'PYQ Analyser', tags: ['Trend analysis','AI explanations'],
    desc: 'Upload previous year question papers and get topic-frequency analysis, predicted high-weightage areas, and solved explanations by AI.' },
  { icon: '⚡', color: '#4a6080', cdim: 'rgba(74,96,128,0.09)', cb: 'rgba(74,96,128,0.22)',
    title: 'Quiz Blitz', tags: ['Quick rounds','Topic-specific'],
    desc: 'Quick-fire quizzes on any topic — 5, 10, or 20 questions, timed rounds. Perfect for a focused 10-minute revision session.' },
]

const FEATURES_TRACK = [
  { highlight: true, icon: '🤖', color: '#c4732a', cdim: 'rgba(196,115,42,0.09)', cb: 'rgba(196,115,42,0.22)',
    title: 'AI Tutor', tags: ['Always available','Step-by-step'],
    desc: 'Ask any question. Get clear, step-by-step explanations — not just answers. Your personal tutor available 24/7, exam-aware and context-sensitive.' },
  { icon: '📊', color: '#5a7a55', cdim: 'rgba(90,122,85,0.09)', cb: 'rgba(90,122,85,0.22)',
    title: 'Progress', tags: ['Subject-wise','Visual charts'],
    desc: 'Visual progress charts across subjects, topics, and time. See where you\'ve improved and where attention is needed before your exam.' },
  { icon: '⏱️', color: '#4a6080', cdim: 'rgba(74,96,128,0.09)', cb: 'rgba(74,96,128,0.22)',
    title: 'Focus Timer', tags: ['Pomodoro','Ambient sounds'],
    desc: 'Pomodoro-style focus sessions with ambient sounds. Track how many hours you\'re actually studying — not just sitting with a book.' },
  { icon: '🔥', color: '#c4732a', cdim: 'rgba(196,115,42,0.09)', cb: 'rgba(196,115,42,0.22)',
    title: 'Streak & XP', tags: ['Daily streaks','XP rewards'],
    desc: 'Build daily study habits through streaks and earn XP for completing tasks. Gamification that actually keeps you accountable.' },
]

function FeatCard({ f, wide, highlight }) {
  return (
    <div className={`l-feat-card${wide ? ' l-feat-wide' : ''}${highlight ? ' l-feat-highlight' : ''}`}>
      <div className="l-feat-icon-wrap" style={{ background: f.cdim, borderColor: f.cb }}>
        <span style={{ fontSize: 18 }}>{f.icon}</span>
      </div>
      <div className="l-feat-content">
        <h3 className="l-feat-title">{f.title}</h3>
        <p className="l-feat-desc">{f.desc}</p>
        <div className="l-feat-tags">
          {f.tags.map(t => <span key={t} className="l-tag">{t}</span>)}
        </div>
      </div>
      {wide && f.preview === 'calendar' && (
        <div className="l-feat-preview">
          <div className="l-cal-row">
            {[
              { label: 'Today', tasks: ['Physics · Ch 3–4', 'Chemistry · Revision'], today: true },
              { label: 'Tomorrow', tasks: ['Maths · Integration', 'Mock Test #3'] },
              { label: 'Day 3', tasks: ['Biology · Genetics', 'PYQ Review'], faint: true },
            ].map(d => (
              <div key={d.label} className={`l-cal-cell${d.today ? ' l-cal-today' : ''}${d.faint ? ' l-cal-faint' : ''}`}>
                <div className="l-cal-label">{d.label}</div>
                {d.tasks.map(t => <div key={t} className="l-cal-task">{t}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
      {wide && f.preview === 'test' && (
        <div className="l-feat-preview">
          <div className="l-test-header">
            <span className="l-test-badge">Mock Test #4</span>
            <span className="l-test-timer">⏱ 01:24:38</span>
          </div>
          <div className="l-test-q">
            <div className="l-test-q-num">Q. 12 of 90</div>
            <div className="l-test-q-text">The work done by a conservative force in moving a particle...</div>
          </div>
          <div className="l-test-opts">
            {['Always positive', 'Path-independent', 'Always negative', 'Depends on velocity'].map((o, i) => (
              <div key={o} className={`l-test-opt${i === 1 ? ' l-test-opt-sel' : ''}`}>{o}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="l-section-divider">
      <div className="l-divider-dot" />
      <span>{label}</span>
      <div className="l-divider-line" />
    </div>
  )
}

export default function LandingFeatures({ onHome, onLogin }) {
  return (
    <div className="l-page-root">

      {/* NAV */}
      <nav className="l-nav">
        <div className="l-nav-inner">
          <span onClick={onHome} className="l-logo" style={{ cursor: 'pointer' }}>
            StudyBuddy<span className="l-logo-dot">·</span>
          </span>
          <div className="l-nav-links">
            <span className="l-nav-link l-nav-active">Features</span>
            <button onClick={onLogin} className="l-btn-nav">Get Started</button>
          </div>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <section className="l-page-header">
        <div className="l-ruled-bg" />
        <div className="l-margin-line" />
        <div className="l-page-header-inner">
          <div className="l-hero-tag">
            <span>📚</span> Everything you need to study smarter
          </div>
          <h1 className="l-page-title">
            Features built for<br/><em>how you actually study</em>
          </h1>
          <p className="l-page-sub">
            Not just tools — a complete learning environment that adapts to your exam, your pace, and your goals.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="l-features-section">
        <div className="l-section-inner">
          <SectionDivider label="Learn" />
          <div className="l-feat-grid">
            {FEATURES_LEARN.map(f => <FeatCard key={f.title} f={f} wide={f.wide} />)}
          </div>

          <SectionDivider label="Practice" />
          <div className="l-feat-grid">
            {FEATURES_PRACTICE.map(f => <FeatCard key={f.title} f={f} wide={f.wide} />)}
          </div>

          <SectionDivider label="Track" />
          <div className="l-feat-grid l-feat-grid-3">
            {FEATURES_TRACK.map(f => <FeatCard key={f.title} f={f} highlight={f.highlight} />)}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="l-cta-banner">
        <div className="l-cta-pattern" />
        <div className="l-cta-accent-line" />
        <div className="l-cta-inner">
          <div className="l-cta-tag">
            <span style={{width:6,height:6,background:'rgba(196,115,42,0.9)',borderRadius:'50%',display:'inline-block'}} />
            Free to get started
          </div>
          <h2 className="l-cta-title">Your exam is closer<br/>than you think. <em>Start now.</em></h2>
          <p className="l-cta-sub">Set up your profile, upload your syllabus, and get a personalized AI study plan in under 2 minutes.</p>
          <button onClick={onLogin} className="l-btn-primary-inv">
            Create your study plan
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p className="l-cta-note">No account required to explore · Your data stays private</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div className="l-logo">StudyBuddy<span className="l-logo-dot">·</span></div>
          <p className="l-footer-text">Built for serious students. Powered by AI.</p>
          <div className="l-footer-links">
            <span onClick={onHome} style={{ cursor: 'pointer' }}>Home</span>
            <span style={{ cursor: 'default' }}>Features</span>
            <span onClick={onLogin} style={{ cursor: 'pointer' }}>Sign In</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
