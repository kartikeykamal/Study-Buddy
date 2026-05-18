import React, { useState, useEffect, useRef } from 'react'
import { Play, RotateCcw, CheckCircle, XCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { callClaude, parseJSON, showToast, storage, addXP, addNotification, syllabusStore, getSubjectColor } from '../utils/index.js'

// ── Timer SVG ─────────────────────────────────────────────────────────────
function Timer({ seconds, total }) {
  const r = 40, circ = 2 * Math.PI * r
  const pct = total > 0 ? seconds / total : 0
  const offset = circ - pct * circ
  const color = pct > 0.5 ? 'var(--mint)' : pct > 0.2 ? 'var(--amber)' : 'var(--rose)'
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return (
    <svg width="90" height="90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--b-default)" strokeWidth="6" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
      <text x="50" y="46" textAnchor="middle" fill="var(--t-primary)" fontSize="15" fontWeight="700" fontFamily="JetBrains Mono">{mins}:{secs}</text>
      <text x="50" y="61" textAnchor="middle" fill="var(--t-muted)" fontSize="8">remaining</text>
    </svg>
  )
}

// ── Subject/Topic picker ──────────────────────────────────────────────────
function SubjectTopicPicker({ profile, syllabusData, selectedSubjects, selectedTopic, onToggleSubject, onSelectTopic, mode }) {
  const [expanded, setExpanded] = useState(null)
  const subjects = profile?.subjects || []
  const syllSubjects = syllabusData?.subjects || []

  const items = subjects.map(sub => {
    const syl = syllSubjects.find(s => s.name === sub)
    return { name: sub, topics: syl?.topics?.map(t => t.name) || [], highPriority: syl?.highPriority || [] }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(item => (
        <div key={item.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 8, border: `1px solid ${selectedSubjects.includes(item.name) ? 'var(--blue-border)' : 'var(--b-default)'}`, background: selectedSubjects.includes(item.name) ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.15s' }}>
            <input type="checkbox" checked={selectedSubjects.includes(item.name)} onChange={() => onToggleSubject(item.name)} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(item.name, subjects) }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-primary)', flex: 1 }}>{item.name}</span>
            {item.topics.length > 0 && (
              <button onClick={e => { e.stopPropagation(); setExpanded(expanded === item.name ? null : item.name) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
                {expanded === item.name ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            )}
          </div>
          {expanded === item.name && item.topics.length > 0 && (
            <div style={{ paddingLeft: 16, marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {item.topics.map(topic => (
                <div key={topic} onClick={() => onSelectTopic(item.name, topic)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: selectedTopic?.topic === topic && selectedTopic?.subject === item.name ? 'var(--blue-bg)' : 'transparent', border: selectedTopic?.topic === topic && selectedTopic?.subject === item.name ? '1px solid var(--blue-border)' : '1px solid transparent' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-secondary)', flex: 1 }}>{topic}</span>
                  {item.highPriority.includes(topic) && <span style={{ fontSize: 9.5, color: 'var(--rose)' }}>🔥</span>}
                  {selectedTopic?.topic === topic && selectedTopic?.subject === item.name && <CheckCircle size={11} color="var(--blue)" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function MockTest({ profile }) {
  const [phase, setPhase] = useState('config')
  const syllabusData = syllabusStore.get()
  const defaultSubjects = profile?.subjects || []

  // Difficulty: Easy | Medium | Hard | Random (mixed)
  const [config, setConfig] = useState({
    subjects: defaultSubjects.slice(0, 1),
    selectedTopic: null, // {subject, topic} for topic-wise
    count: 10,
    difficulty: 'Random', // Easy | Medium | Hard | Random
    timeLimit: 20,
    types: ['MCQ'],
    mode: 'subject', // 'subject' | 'topic'
  })

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [explanations, setExplanations] = useState({})
  const timerRef = useRef(null)

  useEffect(() => {
    if (phase === 'test' && config.timeLimit > 0) {
      setTimeLeft(config.timeLimit * 60)
      timerRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) { clearInterval(timerRef.current); submitTest(); return 0 }
          return p - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  const toggleSubject = (sub) => {
    setConfig(p => ({
      ...p,
      subjects: p.subjects.includes(sub) ? (p.subjects.length > 1 ? p.subjects.filter(s => s !== sub) : p.subjects) : [...p.subjects, sub]
    }))
  }

  const selectTopic = (subject, topic) => {
    setConfig(p => ({
      ...p,
      selectedTopic: p.selectedTopic?.topic === topic && p.selectedTopic?.subject === subject ? null : { subject, topic },
      subjects: [subject]
    }))
  }

  const generate = async () => {
    if (config.mode === 'subject' && config.subjects.length === 0) { showToast('Select at least one subject', 'warning'); return }
    if (config.mode === 'topic' && !config.selectedTopic) { showToast('Select a topic', 'warning'); return }
    setGenerating(true)

    // Build difficulty instruction
    const diffMap = {
      Easy: 'All questions should be Easy difficulty.',
      Medium: 'All questions should be Medium difficulty.',
      Hard: 'All questions should be Hard difficulty.',
      Random: 'Mix difficulties: roughly 30% Easy, 45% Medium, 25% Hard.'
    }

    // Syllabus context
    const syllCtx = (() => {
      if (config.selectedTopic) {
        const syl = syllabusData?.subjects?.find(s => s.name === config.selectedTopic.subject)
        const topicData = syl?.topics?.find(t => t.name === config.selectedTopic.topic)
        return topicData ? `Focus on topic "${config.selectedTopic.topic}". Subtopics: ${topicData.subtopics?.join(', ')}. Key formulas: ${topicData.keyFormulas?.join(', ')}.` : `Focus specifically on the topic: "${config.selectedTopic.topic}".`
      }
      const syls = config.subjects.map(sub => {
        const syl = syllabusData?.subjects?.find(s => s.name === sub)
        return syl ? `${sub} high priority: ${syl.highPriority?.join(', ')}` : ''
      }).filter(Boolean)
      return syls.length ? `Syllabus focus: ${syls.join('. ')}.` : ''
    })()

    const subjectsStr = config.selectedTopic ? config.selectedTopic.subject : config.subjects.join(', ')

    const prompt = `Generate a mock test for ${profile?.examType || 'competitive exam'}.
Subjects: ${subjectsStr}.
${syllCtx}
Number of questions: ${config.count}.
${diffMap[config.difficulty]}
Question types: ${config.types.join(', ')}.
Return ONLY valid JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "question": "...",
      "options": ["A. option","B. option","C. option","D. option"],
      "correctAnswer": "A. option",
      "explanation": "...",
      "difficulty": "Easy|Medium|Hard",
      "subject": "...",
      "topic": "..."
    }
  ]
}
For True/False: options = ["True","False"].
Make questions clear, unambiguous, and exam-relevant. Ensure correctAnswer exactly matches one of the options.`

    const text = await callClaude(prompt, 'You are an expert exam question generator.', 4000)
    if (!text) { setGenerating(false); return }
    const data = parseJSON(text, { questions: [] })
    if (data?.questions?.length > 0) {
      setQuestions(data.questions); setAnswers({}); setFlagged(new Set()); setCurrent(0); setPhase('test')
    } else {
      showToast('Failed to generate questions. Try again.', 'error')
    }
    setGenerating(false)
  }

  const submitTest = () => {
    clearInterval(timerRef.current)
    let correct = 0, skipped = 0
    const bySubject = {}, byTopic = {}
    questions.forEach(q => {
      if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, total: 0 }
      if (!byTopic[q.topic]) byTopic[q.topic] = { correct: 0, total: 0 }
      bySubject[q.subject].total++; byTopic[q.topic].total++
      if (!answers[q.id]) { skipped++; return }
      if (answers[q.id] === q.correctAnswer) { correct++; bySubject[q.subject].correct++; byTopic[q.topic].correct++ }
    })
    const wrong = questions.length - correct - skipped
    const score = Math.round((correct / questions.length) * 100)
    setResults({ score, correct, wrong, skipped, bySubject, byTopic })
    setPhase('results')
    addXP('mock_test')
    addNotification(`Mock test complete! Score: ${score}%`, '🎯')
  }

  const getExplanation = async (qid) => {
    const q = questions.find(x => x.id === qid)
    if (!q) return
    setExplanations(p => ({ ...p, [qid]: 'Loading…' }))
    const text = await callClaude(`Explain why "${q.correctAnswer}" is the correct answer for: "${q.question}". Be concise and clear.`, '', 512)
    setExplanations(p => ({ ...p, [qid]: text || 'Could not load explanation.' }))
  }

  // ── CONFIG PHASE ─────────────────────────────────────────────────────────
  if (phase === 'config') return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--t-primary)' }}>🎯 Mock Test</h1>
      <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 20 }}>Generate an AI-powered exam — subject-wise or topic-wise.</p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', padding: 3, borderRadius: 9, width: 'fit-content', marginBottom: 18 }}>
        {[['subject', '📚 Subject Mode'], ['topic', '🎯 Topic Mode']].map(([m, label]) => (
          <button key={m} onClick={() => setConfig(p => ({ ...p, mode: m, selectedTopic: null }))}
            style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12.5, border: 'none', cursor: 'pointer', fontWeight: config.mode === m ? 600 : 400, background: config.mode === m ? 'var(--bg-card)' : 'transparent', color: config.mode === m ? 'var(--t-primary)' : 'var(--t-secondary)', boxShadow: config.mode === m ? 'var(--sh-xs)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Subject/Topic selection */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 11 }}>
          {config.mode === 'subject' ? 'Select Subjects' : 'Select a Topic'}
        </div>
        <SubjectTopicPicker
          profile={profile} syllabusData={syllabusData}
          selectedSubjects={config.subjects}
          selectedTopic={config.selectedTopic}
          onToggleSubject={toggleSubject}
          onSelectTopic={selectTopic}
          mode={config.mode}
        />
        {config.selectedTopic && (
          <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--blue-bg)', borderRadius: 7, fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
            🎯 Topic: {config.selectedTopic.subject} → {config.selectedTopic.topic}
          </div>
        )}
      </div>

      {/* Difficulty — 3 buttons + Random */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>Difficulty</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['Easy', '🟢', 'var(--mint)', 'rgba(78,205,196,0.12)'],
            ['Medium', '🟡', 'var(--amber)', 'rgba(240,165,0,0.12)'],
            ['Hard', '🔴', 'var(--rose)', 'rgba(255,107,157,0.12)'],
            ['Random', '🎲', 'var(--accent)', 'rgba(124,111,255,0.12)'],
          ].map(([d, icon, color, bg]) => (
            <button key={d} onClick={() => setConfig(p => ({ ...p, difficulty: d }))}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 9, border: `1.5px solid ${config.difficulty === d ? color : 'var(--b-default)'}`, background: config.difficulty === d ? bg : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 11.5, fontWeight: config.difficulty === d ? 700 : 400, color: config.difficulty === d ? color : 'var(--t-secondary)' }}>{d}</span>
            </button>
          ))}
        </div>
        {config.difficulty === 'Random' && <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 8 }}>Mixed: ~30% Easy · 45% Medium · 25% Hard</div>}
      </div>

      {/* Settings row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 6 }}>Questions: {config.count}</div>
          <input type="range" min="5" max="40" step="5" value={config.count}
            onChange={e => setConfig(p => ({ ...p, count: +e.target.value }))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 6 }}>Time Limit: {config.timeLimit}m</div>
          <input type="range" min="5" max="90" step="5" value={config.timeLimit}
            onChange={e => setConfig(p => ({ ...p, timeLimit: +e.target.value }))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
      </div>

      {/* Question types */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 8 }}>Question Types</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {['MCQ', 'True/False', 'Fill in blank', 'Short Answer'].map(t => (
            <button key={t} onClick={() => setConfig(p => ({
              ...p, types: p.types.includes(t) ? (p.types.length > 1 ? p.types.filter(x => x !== t) : p.types) : [...p.types, t]
            }))} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${config.types.includes(t) ? 'var(--blue-border)' : 'var(--b-default)'}`, background: config.types.includes(t) ? 'var(--blue-bg)' : 'transparent', color: config.types.includes(t) ? 'var(--blue)' : 'var(--t-secondary)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={generating || (config.mode === 'subject' && config.subjects.length === 0) || (config.mode === 'topic' && !config.selectedTopic)}
        style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: generating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {generating ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating Test…</> : '🎯 Generate Mock Test'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── TEST PHASE ────────────────────────────────────────────────────────────
  if (phase === 'test') {
    const q = questions[current]
    if (!q) return null
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Q {current + 1} / {questions.length}</div>
            <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>{Object.keys(answers).length} answered</div>
          </div>
          {config.timeLimit > 0 && <Timer seconds={timeLeft} total={config.timeLimit * 60} />}
          <button onClick={() => { if (window.confirm('Submit test now?')) submitTest() }}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
            Submit
          </button>
        </div>

        <div style={{ height: 4, background: 'var(--b-subtle)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ width: `${((current + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: q.difficulty === 'Easy' ? 'rgba(78,205,196,0.15)' : q.difficulty === 'Hard' ? 'rgba(255,107,157,0.15)' : 'rgba(240,165,0,0.15)', color: q.difficulty === 'Easy' ? 'var(--mint)' : q.difficulty === 'Hard' ? 'var(--rose)' : 'var(--amber)', fontWeight: 600 }}>{q.difficulty}</span>
            <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue)' }}>{q.type}</span>
            <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{q.subject}</span>
            {q.topic && <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>· {q.topic}</span>}
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
              onClick={() => setFlagged(p => { const s = new Set(p); s.has(q.id) ? s.delete(q.id) : s.add(q.id); return s })}>
              {flagged.has(q.id) ? '🚩' : '🏳'}
            </button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 18 }}>{q.question}</div>

          {(q.type === 'MCQ' || q.type === 'True/False') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(q.options || []).map((opt, i) => (
                <div key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))}
                  style={{ padding: '11px 15px', borderRadius: 9, border: `1px solid ${answers[q.id] === opt ? 'var(--blue)' : 'var(--b-default)'}`, background: answers[q.id] === opt ? 'var(--blue-bg)' : 'var(--bg-subtle)', cursor: 'pointer', color: answers[q.id] === opt ? 'var(--blue)' : 'var(--t-primary)', fontSize: 13.5, fontWeight: answers[q.id] === opt ? 600 : 400, transition: 'all 0.15s' }}>
                  {opt}
                </div>
              ))}
            </div>
          ) : (
            <textarea style={{ width: '100%', height: 90, padding: '9px 11px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-subtle)', color: 'var(--t-primary)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
              placeholder="Your answer…" value={answers[q.id] || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12.5 }}>← Prev</button>
          <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {questions.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)}
                style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${flagged.has(questions[i].id) ? 'var(--amber)' : answers[questions[i].id] ? 'var(--blue)' : 'var(--b-default)'}`, background: i === current ? 'var(--accent)' : answers[questions[i].id] ? 'var(--blue-bg)' : 'transparent', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === current ? '#fff' : 'var(--t-muted)', fontWeight: 600 }}>
                {i + 1}
              </div>
            ))}
          </div>
          <button onClick={() => current < questions.length - 1 ? setCurrent(p => p + 1) : submitTest()}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
            {current < questions.length - 1 ? 'Next →' : 'Submit 🎯'}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTS PHASE ─────────────────────────────────────────────────────────
  if (phase === 'results' && results) return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>🎯 Test Results</h1>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 78, fontWeight: 900, fontFamily: 'JetBrains Mono', lineHeight: 1, color: results.score >= 70 ? 'var(--mint)' : results.score >= 50 ? 'var(--amber)' : 'var(--rose)' }}>
          {results.score}%
        </div>
        <div style={{ color: 'var(--t-secondary)', marginTop: 7, fontSize: 14 }}>
          {results.score >= 85 ? '🏆 Outstanding!' : results.score >= 70 ? '🎉 Great job!' : results.score >= 50 ? '💪 Good effort!' : '📚 Keep studying!'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[['Correct', results.correct, 'var(--mint)'], ['Wrong', results.wrong, 'var(--rose)'], ['Skipped', results.skipped, 'var(--t-muted)']].map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'JetBrains Mono' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {Object.keys(results.bySubject).length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 11 }}>Subject Breakdown</div>
          {Object.entries(results.bySubject).map(([subj, d]) => (
            <div key={subj} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{subj}</span>
                <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>{d.correct}/{d.total}</span>
              </div>
              <div style={{ height: 4, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${d.total > 0 ? (d.correct / d.total) * 100 : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setReviewMode(p => !p)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
          {reviewMode ? 'Hide Review' : '📋 Review Answers'}
        </button>
        <button onClick={() => { setPhase('config'); setResults(null); setReviewMode(false) }} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
          🔄 New Test
        </button>
      </div>

      {reviewMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q, i) => {
            const userAns = answers[q.id]
            const correct = userAns === q.correctAnswer
            return (
              <div key={q.id} style={{ background: 'var(--bg-card)', border: `1px solid var(--b-default)`, borderLeft: `3px solid ${!userAns ? 'var(--b-default)' : correct ? 'var(--mint)' : 'var(--rose)'}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--t-muted)', marginBottom: 6 }}>Q{i + 1} · {q.subject} · {q.topic}</div>
                <div style={{ fontSize: 13, marginBottom: 9, lineHeight: 1.6 }}>{q.question}</div>
                <div style={{ fontSize: 12, marginBottom: 3 }}><span style={{ color: 'var(--t-muted)' }}>Your answer: </span><span style={{ color: correct ? 'var(--mint)' : 'var(--rose)', fontWeight: 600 }}>{userAns || 'Skipped'}</span></div>
                {!correct && <div style={{ fontSize: 12, marginBottom: 8 }}><span style={{ color: 'var(--t-muted)' }}>Correct: </span><span style={{ color: 'var(--mint)', fontWeight: 600 }}>{q.correctAnswer}</span></div>}
                {!explanations[q.id]
                  ? <button onClick={() => getExplanation(q.id)} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>💡 Explain</button>
                  : <div style={{ padding: '8px 10px', background: 'rgba(124,111,255,0.06)', borderRadius: 7, fontSize: 12, color: 'var(--t-secondary)', lineHeight: 1.65 }}>{explanations[q.id]}</div>
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
