import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Zap, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { callClaude, parseJSON, showToast, storage, addXP, syllabusStore, getSubjectColor } from '../utils/index.js'

// ── Subject+Topic picker ──────────────────────────────────────────────────
function TopicPicker({ profile, syllabusData, subject, topic, onSubject, onTopic }) {
  const [expanded, setExpanded] = useState(null)
  const subjects = profile?.subjects || []
  const syllSubjects = syllabusData?.subjects || []

  const items = subjects.map(sub => {
    const syl = syllSubjects.find(s => s.name === sub)
    return { name: sub, topics: syl?.topics?.map(t => t.name) || [], highPriority: syl?.highPriority || [] }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map(item => (
        <div key={item.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${subject === item.name && !topic ? 'var(--blue-border)' : 'var(--b-default)'}`, background: subject === item.name && !topic ? 'var(--blue-bg)' : 'var(--bg-card)', transition: 'all 0.1s' }}
            onClick={() => { onSubject(item.name); onTopic(''); if (item.topics.length) setExpanded(expanded === item.name ? null : item.name) }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(item.name, subjects), flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-primary)', flex: 1 }}>{item.name}</span>
            <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{item.topics.length > 0 ? `${item.topics.length} topics` : 'Full subject'}</span>
            {item.topics.length > 0 && (expanded === item.name ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          </div>
          {expanded === item.name && item.topics.map(t => (
            <div key={t} onClick={() => { onSubject(item.name); onTopic(t) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 24px', cursor: 'pointer', borderRadius: 6, border: `1px solid ${topic === t ? 'var(--blue-border)' : 'transparent'}`, background: topic === t ? 'var(--blue-bg)' : 'transparent', marginTop: 2 }}>
              <span style={{ fontSize: 11.5, color: 'var(--t-secondary)', flex: 1 }}>{t}</span>
              {item.highPriority.includes(t) && <span style={{ fontSize: 9.5, color: 'var(--rose)' }}>🔥</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function QuizBlitz({ profile }) {
  const [phase, setPhase] = useState('landing')
  const [subject, setSubject] = useState(profile?.subjects?.[0] || '')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState('60s')
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)
  const [answered, setAnswered] = useState(null)
  const [loading, setLoading] = useState(false)
  const [particles, setParticles] = useState([])
  const [correctCount, setCorrectCount] = useState(0)
  const timerRef = useRef(null)
  const advanceRef = useRef(null)
  const syllabusData = syllabusStore.get()

  const TOTAL_TIME = mode === '60s' ? 60 : 90
  const highScore = storage.get(`quiz_hs_${subject}_${topic || 'all'}`, 0)

  const start = async () => {
    if (!subject) { showToast('Select a subject', 'warning'); return }
    setLoading(true)

    const syllSub = syllabusData?.subjects?.find(s => s.name === subject)
    const topicData = syllSub?.topics?.find(t => t.name === topic)
    const syllCtx = topicData
      ? `Focus specifically on "${topic}". Key concepts: ${topicData.subtopics?.slice(0, 5).join(', ')}.`
      : topic
        ? `Focus on the topic: "${topic}" within ${subject}.`
        : syllSub?.highPriority?.length
          ? `Cover varied topics, prioritize: ${syllSub.highPriority.slice(0, 4).join(', ')}.`
          : ''

    const prompt = `Generate 20 fast-paced MCQ questions for a quiz game.
Subject: ${subject}
${topic ? `Topic: ${topic}` : 'Cover varied topics across the subject'}
Exam level: ${profile?.examType || 'competitive exam'}
${syllCtx}

Requirements:
- Each answerable in 5-10 seconds
- Mix of easy (40%), medium (40%), hard (20%)
- 4 options each, exactly one correct
- No ambiguous questions

Return ONLY valid JSON array:
[{"question":"...","options":["A","B","C","D"],"correct":"A","topic":"...","difficulty":"Easy|Medium|Hard"}]`

    const text = await callClaude(prompt, 'You are a fast quiz generator. Make questions clear and accurate.', 2500)
    setLoading(false)
    if (!text) { showToast('Failed to load questions — check API key', 'error'); return }

    const qs = parseJSON(text, [])
    if (!qs?.length) { showToast('Failed to parse questions. Try again.', 'error'); return }

    setQuestions(qs); setIdx(0); setScore(0); setStreak(0); setBestStreak(0); setMultiplier(1)
    setCorrectCount(0); setTimeLeft(TOTAL_TIME); setPhase('playing')

    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); setPhase('end'); return 0 }
        return p - 1
      })
    }, 1000)
  }

  const answer = useCallback((opt) => {
    if (answered !== null || !questions[idx]) return
    const q = questions[idx]
    const correct = opt === q.correct
    setAnswered(correct ? 'correct' : 'wrong')

    if (correct) {
      const newStreak = streak + 1
      const newMulti = newStreak >= 7 ? 4 : newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1
      setStreak(newStreak); setBestStreak(b => Math.max(b, newStreak)); setMultiplier(newMulti)
      setScore(p => p + 10 * newMulti); setCorrectCount(p => p + 1)
      // Particles
      setParticles(Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: Math.random() * 100, y: Math.random() * 100, color: ['#7c6fff', '#f0a500', '#4ecdc4', '#ff6b9d'][i % 4] })))
      setTimeout(() => setParticles([]), 700)
    } else {
      setStreak(0); setMultiplier(1)
    }

    advanceRef.current = setTimeout(() => {
      setAnswered(null)
      setIdx(p => {
        if (p + 1 >= questions.length) { clearInterval(timerRef.current); setPhase('end'); return p }
        return p + 1
      })
    }, 900)
  }, [answered, questions, idx, streak])

  useEffect(() => {
    const handler = (e) => {
      if (phase !== 'playing' || answered !== null) return
      const key = e.key
      const q = questions[idx]
      if (!q) return
      if (key === '1' && q.options?.[0]) answer(q.options[0])
      if (key === '2' && q.options?.[1]) answer(q.options[1])
      if (key === '3' && q.options?.[2]) answer(q.options[2])
      if (key === '4' && q.options?.[3]) answer(q.options[3])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, answered, questions, idx, answer])

  useEffect(() => {
    if (phase === 'end') {
      const key = `quiz_hs_${subject}_${topic || 'all'}`
      const hs = storage.get(key, 0)
      if (score > hs) storage.set(key, score)
      addXP('quiz')
    }
  }, [phase])

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(advanceRef.current) }, [])

  const timePct = timeLeft / TOTAL_TIME
  const timeColor = timePct > 0.5 ? 'var(--mint)' : timePct > 0.25 ? 'var(--amber)' : 'var(--rose)'

  // ── LANDING ───────────────────────────────────────────────────────────────
  if (phase === 'landing') return (
    <div style={{ display: 'flex', gap: 14, height: 'calc(100vh - var(--topbar-height) - var(--dock-height) - 40px)' }}>
      {/* Left: subject/topic picker */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Choose Subject & Topic</div>
        <TopicPicker profile={profile} syllabusData={syllabusData} subject={subject} topic={topic} onSubject={setSubject} onTopic={setTopic} />
      </div>

      {/* Right: config */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, maxWidth: 480 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, color: 'var(--t-primary)' }}>Quiz Blitz</h1>
          <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>Answer fast · Build streaks · Score big</p>
        </div>

        {/* Selected */}
        {subject && (
          <div style={{ padding: '8px 18px', borderRadius: 20, background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
            {subject}{topic ? ` → ${topic}` : ' (Full Subject)'}
          </div>
        )}

        {/* Mode */}
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360 }}>
          {[['60s', '⚡ 60s Sprint', 'Fast & furious'], ['90s', '🏃 90s Marathon', 'More questions']].map(([v, label, desc]) => (
            <button key={v} onClick={() => setMode(v)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '14px 10px', borderRadius: 12, border: `1.5px solid ${mode === v ? 'var(--accent)' : 'var(--b-default)'}`, background: mode === v ? 'rgba(124,111,255,0.08)' : 'var(--bg-card)', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: mode === v ? 'var(--accent)' : 'var(--t-primary)' }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{desc}</span>
            </button>
          ))}
        </div>

        {/* High score */}
        {highScore > 0 && (
          <div style={{ fontSize: 12, color: 'var(--amber)', padding: '5px 14px', background: 'rgba(240,165,0,0.08)', borderRadius: 20, border: '1px solid rgba(240,165,0,0.2)' }}>
            🏆 Best: {highScore} pts {topic ? `(${topic})` : `(${subject})`}
          </div>
        )}

        <button onClick={start} disabled={loading || !subject}
          style={{ width: '100%', maxWidth: 360, padding: '13px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading || !subject ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</> : <><Zap size={16} /> Start Quiz!</>}
        </button>

        <div style={{ display: 'flex', gap: 18, fontSize: 11.5, color: 'var(--t-muted)' }}>
          <span>+10 per correct</span><span>2× at 3 streak</span><span>3× at 5</span><span>4× at 7</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--t-ghost)' }}>Press 1-2-3-4 to answer with keyboard</div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[idx]
    if (!q) return null
    return (
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes popIn { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
          @keyframes burst { 0%{transform:translate(0,0)scale(1);opacity:1} 100%{transform:translate(var(--tx),var(--ty))scale(0);opacity:0} }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'JetBrains Mono', color: 'var(--accent)', lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 9.5, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
          </div>

          {/* Timer */}
          <svg width="78" height="78" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--b-default)" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={timeColor} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - timePct)}`}
              strokeLinecap="round" transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
            <text x="40" y="44" textAnchor="middle" fill={timeColor} fontSize="17" fontWeight="900" fontFamily="JetBrains Mono">{timeLeft}</text>
          </svg>

          <div style={{ textAlign: 'center', minWidth: 60 }}>
            {multiplier > 1 && <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--amber)', fontFamily: 'JetBrains Mono', animation: 'popIn 0.2s ease-out' }}>{multiplier}×</div>}
            {streak > 0 && <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>🔥 {streak}</div>}
            <div style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{idx + 1}/{questions.length}</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: 'var(--b-subtle)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ width: `${(idx / questions.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>

        {/* Question card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 14, padding: '18px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden', minHeight: 120 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {q.topic && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue)' }}>{q.topic}</span>}
            <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: q.difficulty === 'Easy' ? 'rgba(78,205,196,0.15)' : q.difficulty === 'Hard' ? 'rgba(255,107,157,0.15)' : 'rgba(240,165,0,0.15)', color: q.difficulty === 'Easy' ? 'var(--mint)' : q.difficulty === 'Hard' ? 'var(--rose)' : 'var(--amber)' }}>{q.difficulty}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6 }}>{q.question}</div>
          {/* Particles */}
          {particles.map(p => (
            <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: 9, height: 9, borderRadius: '50%', background: p.color, pointerEvents: 'none', '--tx': `${(Math.random() - 0.5) * 80}px`, '--ty': `${(Math.random() - 0.5) * 80}px`, animation: 'burst 0.7s ease-out forwards' }} />
          ))}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(q.options || []).map((opt, i) => {
            let bg = 'var(--bg-card)', border = 'var(--b-default)', color = 'var(--t-primary)'
            if (answered !== null) {
              if (opt === q.correct) { bg = 'rgba(78,205,196,0.12)'; border = 'var(--mint)'; color = 'var(--mint)' }
              else if (answered === 'wrong') { bg = 'rgba(255,107,157,0.07)'; border = 'rgba(255,107,157,0.25)'; color = 'var(--t-muted)' }
            }
            return (
              <div key={i} onClick={() => answer(opt)}
                style={{ padding: '12px 16px', borderRadius: 11, border: `1px solid ${border}`, background: bg, cursor: answered !== null ? 'default' : 'pointer', transition: 'all 0.15s', color, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--t-muted)', flexShrink: 0 }}>{i + 1}</span>
                {opt}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── END ───────────────────────────────────────────────────────────────────
  if (phase === 'end') {
    const best = storage.get(`quiz_hs_${subject}_${topic || 'all'}`, 0)
    const isNew = score > 0 && score >= best
    const accuracy = questions.length > 0 ? Math.round((correctCount / Math.max(idx + 1, 1)) * 100) : 0
    return (
      <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center', paddingTop: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{score >= 150 ? '🏆' : score >= 80 ? '🎉' : '💪'}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Quiz Over!</h1>
        {isNew && <div style={{ display: 'inline-block', marginBottom: 14, padding: '5px 18px', background: 'rgba(240,165,0,0.1)', borderRadius: 20, border: '1px solid rgba(240,165,0,0.3)', color: 'var(--amber)', fontWeight: 700, fontSize: 13 }}>🏆 New High Score!</div>}
        <div style={{ fontSize: 72, fontWeight: 900, fontFamily: 'JetBrains Mono', color: 'var(--accent)', lineHeight: 1, marginBottom: 7 }}>{score}</div>
        <div style={{ fontSize: 13, color: 'var(--t-secondary)', marginBottom: 22 }}>
          {correctCount} correct · {accuracy}% accuracy · 🔥 {bestStreak} streak
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--mint)', fontFamily: 'JetBrains Mono' }}>{correctCount}</div>
            <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Correct</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{best}</div>
            <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>High Score</div>
          </div>
        </div>
        <button onClick={() => { setPhase('landing'); setQuestions([]) }}
          style={{ width: '100%', padding: '12px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ⚡ Play Again
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }
}
