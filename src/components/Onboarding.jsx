import React, { useState, useEffect, useRef } from 'react'
import { callClaude, parseJSON, storage, showToast, addNotification } from '../utils/index.js'

const EXAM_SUBJECTS = {
  JEE:   ['Physics', 'Chemistry', 'Mathematics'],
  NEET:  ['Physics', 'Chemistry', 'Biology'],
  Board: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History'],
  'University Semester': ['Mathematics', 'Physics', 'Computer Science', 'English', 'Economics'],
  Custom: []
}

/* ─── tiny helpers ─── */
function RuledCard({ children, style = {} }) {
  return (
    <div style={{
      background: '#fefcf8',
      border: '1px solid rgba(140,120,90,0.18)',
      borderRadius: 18,
      boxShadow: '0 4px 18px rgba(60,40,10,0.09), 0 1px 4px rgba(60,40,10,0.05)',
      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(160,140,110,0.11) 31px, rgba(160,140,110,0.11) 32px)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* margin line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 44, width: 1, background: 'rgba(210,140,120,0.18)', pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

function Dot({ active, done }) {
  return (
    <div style={{
      width: active ? 22 : 7,
      height: 7,
      borderRadius: 4,
      background: active ? '#c4732a' : done ? 'rgba(196,115,42,0.4)' : 'rgba(160,140,110,0.25)',
      transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }} />
  )
}

/* ─── feature data ─── */
const FEATURES = [
  {
    icon: '📋',
    color: '#c4732a',
    colorDim: 'rgba(196,115,42,0.1)',
    colorBorder: 'rgba(196,115,42,0.22)',
    title: 'AI Study Planner',
    desc: 'Your personalised 7-day schedule, generated in seconds. AI adapts your plan around your exam date, subjects, and daily goals.',
    bullets: ['Smart task scheduling', 'Difficulty balancing', 'Daily goal tracking'],
  },
  {
    icon: '🧠',
    color: '#5a7a55',
    colorDim: 'rgba(90,122,85,0.1)',
    colorBorder: 'rgba(90,122,85,0.22)',
    title: 'Syllabus Analyser',
    desc: 'Upload your PDF syllabus and watch AI break it into topics, prioritise by weight, and map everything to a learning path.',
    bullets: ['PDF upload & parsing', 'Topic prioritisation', 'Coverage tracking'],
  },
  {
    icon: '✏️',
    color: '#4a6080',
    colorDim: 'rgba(74,96,128,0.1)',
    colorBorder: 'rgba(74,96,128,0.22)',
    title: 'AI Tutor',
    desc: 'Chat with an AI that knows your syllabus. Ask conceptual doubts, get step-by-step solutions, or request analogies and examples.',
    bullets: ['Syllabus-aware answers', 'Step-by-step solutions', 'Instant doubt clearing'],
  },
  {
    icon: '📝',
    color: '#8a5a72',
    colorDim: 'rgba(138,90,114,0.1)',
    colorBorder: 'rgba(138,90,114,0.22)',
    title: 'Mock Tests & PYQs',
    desc: 'Auto-generated mock papers and previous year question analysis. Know which topics appear most and focus your energy there.',
    bullets: ['PYQ pattern analysis', 'Topic-wise mock tests', 'Timed exam simulation'],
  },
  {
    icon: '🃏',
    color: '#7a6030',
    colorDim: 'rgba(122,96,48,0.1)',
    colorBorder: 'rgba(122,96,48,0.22)',
    title: 'Flashcards & Quizzes',
    desc: 'Spaced-repetition flashcards auto-generated from your notes. Quiz Blitz mode for rapid-fire revision before exams.',
    bullets: ['Auto-generated cards', 'Spaced repetition', 'Quiz Blitz mode'],
  },
  {
    icon: '📈',
    color: '#4a7060',
    colorDim: 'rgba(74,112,96,0.1)',
    colorBorder: 'rgba(74,112,96,0.22)',
    title: 'Progress & Streaks',
    desc: 'Track your study streak, earn XP, level up, and see activity heatmaps. Staying consistent has never felt this rewarding.',
    bullets: ['Daily streak tracking', 'XP & level system', 'Activity heatmap'],
  },
]

/* ─── Background decoration shared across all screens ─── */
function NbgBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(160,140,110,0.15) 27px, rgba(160,140,110,0.15) 28px)',
      backgroundSize: '100% 28px', background: '#f7f3ec',
    }}>
      {/* left margin line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '18%', width: 1, background: 'rgba(210,140,120,0.18)' }} />
      {/* drifting pencils */}
      {[
        { top: '8%',  left: '3%',   size: 48, delay: 0,  dur: 20, color: 'rgba(196,115,42,0.28)'  },
        { top: '55%', left: '1.5%', size: 36, delay: 6,  dur: 26, color: 'rgba(90,122,85,0.25)'   },
        { top: '18%', right: '2%',  size: 44, delay: 3,  dur: 22, color: 'rgba(74,96,128,0.25)'   },
        { top: '70%', right: '4%',  size: 32, delay: 10, dur: 18, color: 'rgba(184,90,90,0.22)'   },
      ].map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.top, left: p.left, right: p.right,
          opacity: 0.12, animation: `pencilDrift${i%2} ${p.dur}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
        }}>
          <PencilSVG size={p.size} color={p.color} />
        </div>
      ))}
      {/* ink ripples */}
      {[
        { top: '20%', left: '25%', sz: 28, delay: 0, dur: 9 },
        { top: '65%', left: '60%', sz: 22, delay: 4, dur: 11 },
        { top: '40%', left: '80%', sz: 18, delay: 7, dur: 8  },
      ].map((r, i) => (
        <div key={`r${i}`} style={{
          position: 'absolute', top: r.top, left: r.left,
          width: r.sz, height: r.sz, borderRadius: '50%',
          border: '1px solid rgba(196,115,42,0.14)',
          marginLeft: -r.sz/2, marginTop: -r.sz/2,
          animation: `inkRipple ${r.dur}s ease-out ${r.delay}s infinite`,
        }} />
      ))}
      {/* writing lines */}
      {[
        { top: '22%', left: '20%', w: 160, delay: 0,  dur: 13 },
        { top: '48%', left: '14%', w: 120, delay: 5,  dur: 16 },
        { top: '75%', left: '28%', w:  90, delay: 9,  dur: 11 },
      ].map((l, i) => (
        <div key={`wl${i}`} style={{
          position: 'absolute', top: l.top, left: l.left,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(196,115,42,0.20), transparent)',
          animation: `writeLine ${l.dur}s ease-in-out ${l.delay}s infinite`,
          opacity: 0, '--line-w': `${l.w}px`,
        }} />
      ))}
      <style>{`
        @keyframes pencilDrift0 { 0%,100%{transform:translate(0,0) rotate(-20deg)} 33%{transform:translate(10px,-13px) rotate(-16deg)} 66%{transform:translate(-6px,7px) rotate(-23deg)} }
        @keyframes pencilDrift1 { 0%,100%{transform:translate(0,0) rotate(-18deg)} 50%{transform:translate(8px,-9px) rotate(-14deg)} }
        @keyframes inkRipple    { 0%{transform:scale(0);opacity:0.6} 100%{transform:scale(4.5);opacity:0} }
        @keyframes writeLine    { 0%{width:0;opacity:0} 10%{opacity:1} 80%{width:var(--line-w);opacity:0.5} 100%{width:var(--line-w);opacity:0} }
      `}</style>
    </div>
  )
}

function PencilSVG({ size = 48, color = 'rgba(196,115,42,0.3)' }) {
  return (
    <svg width={size} height={size * 3.5} viewBox="0 0 14 50" fill="none">
      <rect x="3" y="0" width="8" height="6" rx="1.5" fill="rgba(200,160,140,0.55)" />
      <rect x="3" y="6" width="8" height="2.5" fill="rgba(180,140,100,0.45)" />
      <rect x="3" y="8.5" width="8" height="32" fill={color} />
      <polygon points="3,40.5 11,40.5 7,50" fill="rgba(140,100,60,0.4)" />
      <polygon points="5.5,46 8.5,46 7,50" fill="rgba(90,70,55,0.5)" />
      <line x1="5" y1="9" x2="5" y2="40" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </svg>
  )
}

/* ═══════════════════════════════════════
   SCREEN 0 — SPLASH
═══════════════════════════════════════ */
function ScreenSplash({ onNext }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, position: 'relative', zIndex: 1 }}>
      <div style={{
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        maxWidth: 480, width: '100%',
      }}>
        {/* Notebook icon */}
        <div style={{
          width: 88, height: 88, borderRadius: 22,
          background: '#fefcf8', border: '1px solid rgba(140,120,90,0.2)',
          boxShadow: '0 6px 28px rgba(60,40,10,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, marginBottom: 28,
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 15px, rgba(160,140,110,0.18) 15px, rgba(160,140,110,0.18) 16px)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 18, width: 1, background: 'rgba(210,140,120,0.25)' }} />
          <span style={{ position: 'relative', zIndex: 1 }}>📖</span>
        </div>

        <h1 style={{
          fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 52,
          color: '#2c2416', marginBottom: 8, letterSpacing: '-0.5px', lineHeight: 1,
        }}>
          StudyBuddy
        </h1>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 15,
          color: '#8a7a62', marginBottom: 44, letterSpacing: '0.02em',
        }}>
          Your intelligent study companion
        </div>

        {/* tagline card */}
        <RuledCard style={{ padding: '22px 26px 22px 58px', marginBottom: 36, width: '100%' }}>
          <p style={{
            fontFamily: "'Lora', serif", fontStyle: 'italic',
            fontSize: 17, lineHeight: 1.75, color: '#3a3020',
          }}>
            "Crack your exam with an AI that studies alongside you — planning, tutoring, testing, and tracking every step."
          </p>
        </RuledCard>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onNext}
            style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
              padding: '12px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#2c2416', color: '#fefcf8',
              boxShadow: '0 3px 12px rgba(44,36,22,0.25)',
              transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(44,36,22,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(44,36,22,0.25)' }}
          >
            See what's inside
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        <div style={{ marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(160,140,110,0.7)', letterSpacing: '0.04em' }}>
          Free to use · No account required
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   SCREEN 1 — FEATURES WALKTHROUGH
═══════════════════════════════════════ */
function ScreenFeatures({ onNext, onBack }) {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 60) }, [])

  const go = (dir) => {
    if (animating) return
    const next = active + dir
    if (next < 0 || next >= FEATURES.length) return
    setAnimating(true)
    setTimeout(() => { setActive(next); setAnimating(false) }, 200)
  }

  const f = FEATURES[active]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px 20px', position: 'relative', zIndex: 1,
    }}>
      <div style={{
        maxWidth: 520, width: '100%',
        opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
        transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(160,140,110,0.8)', fontFamily: "'Inter', sans-serif", fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            ← Back
          </button>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(160,140,110,0.75)' }}>
            What's Inside
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(196,115,42,0.7)' }}>
            {active + 1} / {FEATURES.length}
          </div>
        </div>

        {/* feature card */}
        <RuledCard style={{
          padding: '28px 28px 28px 60px', marginBottom: 20,
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(6px)' : 'none',
          transition: 'all 0.2s ease',
        }}>
          {/* icon badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, fontSize: 24,
              background: f.colorDim, border: `1px solid ${f.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {f.icon}
            </div>
            <h2 style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 28, color: '#2c2416', lineHeight: 1 }}>
              {f.title}
            </h2>
          </div>

          <p style={{
            fontFamily: "'Lora', serif", fontStyle: 'italic',
            fontSize: 14.5, lineHeight: 1.75, color: '#5a4e3a', marginBottom: 20,
          }}>
            {f.desc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {f.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, flexShrink: 0, boxShadow: `0 0 5px ${f.color}55` }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#6a5a48', fontWeight: 500 }}>
                  {b}
                </span>
              </div>
            ))}
          </div>
        </RuledCard>

        {/* dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {FEATURES.map((_, i) => (
            <div
              key={i}
              onClick={() => { if (!animating) { setAnimating(true); setTimeout(() => { setActive(i); setAnimating(false) }, 200) } }}
              style={{
                width: active === i ? 20 : 6, height: 6, borderRadius: 3, cursor: 'pointer',
                background: active === i ? f.color : 'rgba(160,140,110,0.28)',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          ))}
        </div>

        {/* nav buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => go(-1)}
            disabled={active === 0}
            style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13,
              padding: '9px 20px', borderRadius: 8,
              background: 'transparent', color: active === 0 ? 'rgba(160,140,110,0.4)' : '#5a4e3a',
              border: '1px solid rgba(140,120,90,0.22)', cursor: active === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >← Previous</button>

          {active < FEATURES.length - 1 ? (
            <button
              onClick={() => go(1)}
              style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
                padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: f.color, color: '#fefcf8',
                boxShadow: `0 2px 10px ${f.color}44`,
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >Next →</button>
          ) : (
            <button
              onClick={onNext}
              style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
                padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#2c2416', color: '#fefcf8',
                boxShadow: '0 3px 12px rgba(44,36,22,0.25)',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >Get Started →</button>
          )}
        </div>

        {/* skip */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(160,140,110,0.65)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   SETUP FLOW (steps 0-3)
═══════════════════════════════════════ */
function SetupFlow({ onComplete }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [examType, setExamType] = useState('JEE')
  const [examDate, setExamDate] = useState('')
  const [subjects, setSubjects] = useState([])
  const [subInput, setSubInput] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 60) }, [])

  const addSubject = (s) => {
    const val = s.trim()
    if (val && !subjects.includes(val) && subjects.length < 10) setSubjects(p => [...p, val])
    setSubInput('')
  }

  const generate = async () => {
    if (!name || !examDate || subjects.length === 0) { showToast('Please fill all fields', 'warning'); return }
    setGenerating(true)
    const days = Math.ceil((new Date(examDate) - new Date()) / 86400000)
    const prompt = `You are a study plan expert. The student "${name}" is preparing for ${examType} on ${examDate} (${days} days away). Subjects: ${subjects.join(', ')}. Generate a 7-day optimized study schedule. Return ONLY valid JSON array of day objects: [{ "day": 1, "date": "YYYY-MM-DD", "tasks": [{ "topic": "...", "subject": "...", "estimatedMinutes": 45, "difficulty": "Medium", "description": "..." }] }]. Generate 3-5 tasks per day.`
    const text = await callClaude(prompt)
    const plan = parseJSON(text, [])
    const profile = { name, examType, examDate, subjects }
    storage.set('profile', profile)
    storage.set('studyplan', plan)
    storage.set('streak', { xp: 5, level: 1, streak: 1, lastDate: new Date().toISOString().split('T')[0] })
    addNotification(`Welcome, ${name}! Your study plan is ready.`, '🎉')
    setGenerating(false)
    onComplete(profile)
  }

  const STEPS = ['About you', 'Subjects', 'Review']

  const inputStyle = {
    background: '#fefcf8', border: '1px solid rgba(140,120,90,0.22)',
    borderRadius: 8, padding: '9px 12px',
    color: '#2c2416', fontFamily: "'Inter', sans-serif", fontSize: 13.5,
    width: '100%', outline: 'none', transition: 'border-color 0.18s',
  }
  const labelStyle = { fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: '#8a7a62', marginBottom: 5, display: 'block', letterSpacing: '0.3px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, position: 'relative', zIndex: 1 }}>
      <div style={{
        maxWidth: 480, width: '100%',
        opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
        transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 34, color: '#2c2416', marginBottom: 4 }}>
            Let's set you up
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: 'rgba(160,140,110,0.8)' }}>
            Takes about 60 seconds
          </div>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 26 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Dot active={i === step} done={i < step} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: i === step ? '#c4732a' : 'rgba(160,140,110,0.55)' }}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 28, height: 1, background: 'rgba(160,140,110,0.22)', marginBottom: 14 }} />}
            </React.Fragment>
          ))}
        </div>

        <RuledCard style={{ padding: '28px 28px 28px 60px' }}>
          {/* STEP 0 — About you */}
          {step === 0 && (
            <div>
              <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 22, color: '#2c2416', marginBottom: 18 }}>
                About your exam
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Your name</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kartikey" autoFocus
                  onFocus={e => e.target.style.borderColor = '#c4732a'}
                  onBlur={e => e.target.style.borderColor = 'rgba(140,120,90,0.22)'} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Exam type</label>
                <select style={inputStyle} value={examType}
                  onChange={e => { setExamType(e.target.value); setSubjects(EXAM_SUBJECTS[e.target.value] || []) }}>
                  <option>JEE</option><option>NEET</option><option>Board</option>
                  <option>University Semester</option><option>Custom</option>
                </select>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Exam date</label>
                <input style={inputStyle} type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  onFocus={e => e.target.style.borderColor = '#c4732a'}
                  onBlur={e => e.target.style.borderColor = 'rgba(140,120,90,0.22)'} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { if (name && examDate) { setSubjects(EXAM_SUBJECTS[examType] || []); setStep(1) } else showToast('Fill all fields', 'warning') }}
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#2c2416', color: '#fefcf8', boxShadow: '0 2px 8px rgba(44,36,22,0.2)', transition: 'all 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >Next →</button>
              </div>
            </div>
          )}

          {/* STEP 1 — Subjects */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 22, color: '#2c2416', marginBottom: 6 }}>
                Your subjects
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: '#8a7a62', marginBottom: 16 }}>
                Add up to 10 subjects — press Enter to add each
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12, minHeight: 34 }}>
                {subjects.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(196,115,42,0.09)', border: '1px solid rgba(196,115,42,0.22)', borderRadius: 20, fontSize: 12.5, fontFamily: "'Inter', sans-serif", color: '#5a4e3a' }}>
                    {s}
                    <span onClick={() => setSubjects(p => p.filter(x => x !== s))} style={{ cursor: 'pointer', color: 'rgba(160,140,110,0.7)', fontSize: 14, lineHeight: 1 }}>×</span>
                  </span>
                ))}
              </div>
              <input style={{ ...inputStyle, marginBottom: 14 }} value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSubject(subInput) } }}
                placeholder={subjects.length >= 10 ? 'Maximum 10 subjects' : 'Type subject and press Enter'}
                disabled={subjects.length >= 10}
                onFocus={e => e.target.style.borderColor = '#c4732a'}
                onBlur={e => e.target.style.borderColor = 'rgba(140,120,90,0.22)'} />
              {(EXAM_SUBJECTS[examType] || []).filter(s => !subjects.includes(s)).length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ ...labelStyle, marginBottom: 7 }}>Suggestions for {examType}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(EXAM_SUBJECTS[examType] || []).filter(s => !subjects.includes(s)).map(s => (
                      <span key={s} onClick={() => addSubject(s)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: 'rgba(160,140,110,0.09)', border: '1px solid rgba(160,140,110,0.2)', borderRadius: 20, fontSize: 12, fontFamily: "'Inter', sans-serif", color: '#8a7a62', cursor: 'pointer', transition: 'all 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#c4732a'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(160,140,110,0.2)'}
                      >+ {s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(0)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(140,120,90,0.22)', color: '#5a4e3a', cursor: 'pointer' }}>← Back</button>
                <button onClick={() => subjects.length > 0 ? setStep(2) : showToast('Add at least one subject', 'warning')}
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#2c2416', color: '#fefcf8', boxShadow: '0 2px 8px rgba(44,36,22,0.2)', transition: 'all 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >Next →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — Review & Generate */}
          {step === 2 && (
            <div style={{ textAlign: generating ? 'center' : 'left' }}>
              {generating ? (
                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                  <div style={{ fontSize: 36, animation: 'penWrite 1.2s ease-in-out infinite' }}>✏️</div>
                  <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 22, color: '#2c2416' }}>
                    Writing your plan…
                  </div>
                  <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 13.5, color: '#8a7a62', maxWidth: 260, textAlign: 'center', lineHeight: 1.7 }}>
                    AI is crafting your personalised 7-day study schedule
                  </div>
                  <style>{`@keyframes penWrite { 0%,100%{transform:rotate(-20deg) translateY(0)} 50%{transform:rotate(-15deg) translateY(-6px)} }`}</style>
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 22, color: '#2c2416', marginBottom: 18 }}>
                    Ready to generate ✦
                  </div>
                  {[
                    { label: 'Name', value: name },
                    { label: 'Exam', value: examType },
                    { label: 'Date', value: examDate },
                    { label: 'Subjects', value: subjects.join(', ') },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(160,140,110,0.12)' }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(160,140,110,0.75)', width: 58, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: '#3a3020' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => setStep(1)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(140,120,90,0.22)', color: '#5a4e3a', cursor: 'pointer' }}>← Back</button>
                    <button onClick={generate}
                      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#c4732a', color: '#fefcf8', boxShadow: '0 3px 10px rgba(196,115,42,0.35)', transition: 'all 0.18s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(196,115,42,0.42)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(196,115,42,0.35)' }}
                    >Generate My Plan ✨</button>
                  </div>
                </>
              )}
            </div>
          )}
        </RuledCard>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   ROOT — controls which screen is showing
═══════════════════════════════════════ */
export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0)
  // 0 = splash, 1 = feature walkthrough, 2 = setup flow

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f7f3ec' }}>
      <NbgBg />
      {screen === 0 && <ScreenSplash onNext={() => setScreen(1)} />}
      {screen === 1 && <ScreenFeatures onNext={() => setScreen(2)} onBack={() => setScreen(0)} />}
      {screen === 2 && <SetupFlow onComplete={onComplete} />}
    </div>
  )
}
