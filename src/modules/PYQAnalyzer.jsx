import React, { useState, useRef } from 'react'
import { Upload, RefreshCw, X, FileText, Zap, Target, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react'
import { callClaude, callClaudeWithPDFs, parseJSON, showToast, storage, addXP, addNotification } from '../utils/index.js'

export default function PYQAnalyzer({ profile, onNavigate }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(storage.get('pyq', null))
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState({ topic: 'All', difficulty: 'All', year: 'All' })
  const [mockLoading, setMockLoading] = useState(false)
  const [mockData, setMockData] = useState(null)
  const [mockPhase, setMockPhase] = useState('config') // 'config' | 'test' | 'results'
  const [mockAnswers, setMockAnswers] = useState({})
  const [mockCurrent, setMockCurrent] = useState(0)
  const [mockType, setMockType] = useState('similar') // 'similar' | 'predicted' | 'mixed'
  const [mockCount, setMockCount] = useState(10)
  const [mockResults, setMockResults] = useState(null)
  const fileRef = useRef()

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    setFiles(prev => [...prev, ...selected].slice(0, 10))
  }

  const dropHandler = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    setFiles(prev => [...prev, ...dropped].slice(0, 10))
  }

  const analyze = async () => {
    if (files.length === 0 && !text.trim()) { showToast('Upload PDFs or paste questions', 'warning'); return }
    setLoading(true)
    const prompt = `You are an expert exam analyst. Analyze these previous year questions for ${profile?.examType || 'the exam'}.
Return ONLY valid JSON (no extra text):
{
  "totalQuestions": number,
  "yearsAnalyzed": ["2023","2022"],
  "subjectsFound": ["subject1","subject2"],
  "overview": "2-3 sentence overall summary of the PYQ patterns",
  "topicFrequency": [{"topic":"...","subject":"...","count":number,"percentage":number,"trend":"Rising|Stable|Falling","years":["2023"]}],
  "difficultyDistribution": {"easy":number,"medium":number,"hard":number},
  "subjectWise": [{"subject":"...","count":number,"percentage":number,"keyTopics":["t1","t2"]}],
  "predictedHighValueTopics": [{"topic":"...","subject":"...","probability":number,"reason":"...","similarPastQ":"..."}],
  "questionPatterns": ["pattern1","pattern2","pattern3"],
  "mostRepeatedQuestions": [{"text":"...","topic":"...","subject":"...","times":number,"years":["2022","2021"]}],
  "questions": [{"text":"...","topic":"...","subject":"...","difficulty":"Easy|Medium|Hard","year":"2023","type":"MCQ|Short|Long","marks":number}],
  "examStrategy": "detailed strategy paragraph",
  "studyRecommendations": ["rec1","rec2","rec3","rec4","rec5"],
  "commonMistakes": ["mistake1","mistake2"],
  "upcomingPredictions": "paragraph about what's likely to come next"
}
Be thorough. Analyze ALL questions. Extract every single question you can identify.`

    let resp
    try {
      if (files.length > 0) {
        // Process in batches if more than 3 files (API limit)
        if (files.length <= 3) {
          resp = await callClaudeWithPDFs(files, prompt, '', 6000)
        } else {
          // Analyze in chunks then merge
          const chunk1 = await callClaudeWithPDFs(files.slice(0, 3), prompt, '', 5000)
          const chunk2 = await callClaudeWithPDFs(files.slice(3, 6), prompt, '', 5000)
          const chunk3 = files.length > 6 ? await callClaudeWithPDFs(files.slice(6, 10), prompt, '', 5000) : null

          const mergePrompt = `Merge these ${chunk3 ? '3' : '2'} PYQ analysis results into one comprehensive analysis. Combine all questions, merge topic frequencies, recalculate percentages. Return ONLY valid JSON in the same format.
Analysis 1: ${chunk1}
Analysis 2: ${chunk2}
${chunk3 ? `Analysis 3: ${chunk3}` : ''}`
          resp = await callClaude(mergePrompt, '', 6000)
        }
      } else {
        resp = await callClaude(`Questions to analyze:\n${text.slice(0, 6000)}\n\n${prompt}`, '', 5000)
      }

      const parsed = parseJSON(resp)
      if (parsed && (parsed.questions?.length > 0 || parsed.topicFrequency?.length > 0)) {
        setData(parsed); storage.set('pyq', parsed)
        addXP('pyq'); addNotification(`PYQ analysis done! ${parsed.totalQuestions || parsed.questions?.length || '?'} questions found`, '📊')
        showToast('Analysis complete!', 'success'); setTab('overview')
      } else {
        showToast('Analysis failed — try with more text or fewer files at once', 'error')
      }
    } catch (e) {
      console.error(e); showToast('Analysis failed', 'error')
    }
    setLoading(false)
  }

  // ── PYQ Mock Test Generator ───────────────────────────────────────────────
  const generatePYQMock = async () => {
    if (!data) return
    setMockLoading(true); setMockData(null)

    const topTopics = data.topicFrequency?.slice(0, 8).map(t => t.topic).join(', ') || ''
    const predictedTopics = data.predictedHighValueTopics?.slice(0, 5).map(t => t.topic).join(', ') || ''
    const sampleQs = (data.questions || []).slice(0, 15).map(q => q.text).join('\n')

    const typeMap = {
      similar: `Generate questions SIMILAR to these actual PYQs in style, difficulty, and topic. Past questions:\n${sampleQs}`,
      predicted: `Generate questions on these PREDICTED high-probability topics: ${predictedTopics || topTopics}. Focus on what's most likely to come in the next exam.`,
      mixed: `Mix of: (a) questions similar to past PYQs, (b) predicted upcoming questions, (c) questions on most-repeated topics: ${topTopics}.`
    }

    const prompt = `You are an expert exam paper creator for ${profile?.examType || 'exam'}.
PYQ analysis context: ${data.overview || ''}
Topic frequency insights: ${topTopics ? `Most asked: ${topTopics}` : ''}

${typeMap[mockType]}

Generate ${mockCount} exam-quality MCQ questions.
Return ONLY valid JSON:
{
  "title": "PYQ-Based Practice Test",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A. option","B. option","C. option","D. option"],
      "correctAnswer": "A. option",
      "explanation": "...",
      "difficulty": "Easy|Medium|Hard",
      "topic": "...",
      "subject": "...",
      "pyqSource": "Similar to [year] paper / Predicted topic / Most repeated"
    }
  ]
}`

    const text2 = await callClaude(prompt, '', 4000)
    const parsed = parseJSON(text2)
    if (parsed?.questions?.length > 0) {
      setMockData(parsed); setMockPhase('test'); setMockAnswers({}); setMockCurrent(0)
      showToast(`${parsed.questions.length} questions generated!`, 'success')
    } else {
      showToast('Failed to generate mock test', 'error')
    }
    setMockLoading(false)
  }

  const submitMock = () => {
    const qs = mockData?.questions || []
    if (qs.length === 0) return
    let correct = 0
    qs.forEach(q => { if (mockAnswers[q.id] === q.correctAnswer) correct++ })
    const unanswered = qs.length - Object.keys(mockAnswers).length
    setMockResults({ score: Math.round((correct / qs.length) * 100), correct, wrong: qs.length - correct - unanswered, total: qs.length })
    setMockPhase('results')
  }

  const allTopics = data ? ['All', ...new Set((data.questions || []).map(q => q.topic).filter(Boolean))] : ['All']
  const allYears = data ? ['All', ...[...new Set((data.questions || []).map(q => String(q.year || '')).filter(Boolean))].sort().reverse()] : ['All']
  const filteredQs = (data?.questions || []).filter(q => {
    return (filter.topic === 'All' || q.topic === filter.topic) &&
      (filter.difficulty === 'All' || q.difficulty === filter.difficulty) &&
      (filter.year === 'All' || q.year === filter.year)
  })

  const freqCounts = data?.topicFrequency?.map(t => t.count) || []
  const maxFreq = freqCounts.length > 0 ? Math.max(...freqCounts) : 1

  // ── UPLOAD SCREEN ──────────────────────────────────────────────────────────
  if (!data) return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>📊 PYQ Analyzer</h1>
      <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 22 }}>
        Upload up to <strong>10 past year papers</strong>. AI will analyze patterns, predict upcoming topics, and create a custom practice test.
      </p>

      {/* Drop zone */}
      <div onDrop={dropHandler} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
        style={{ border: '2px dashed var(--b-default)', borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: 'var(--bg-subtle)', transition: 'border-color 0.2s' }}>
        <Upload size={32} color="var(--t-muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>Drop PYQ PDFs here</div>
        <div style={{ fontSize: 12, color: 'var(--t-muted)' }}>or click to browse · up to <strong>10 papers</strong> supported</div>
        <input ref={fileRef} type="file" accept=".pdf" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 3 }}>{files.length} file{files.length > 1 ? 's' : ''} selected</div>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--b-default)' }}>
              <FileText size={14} color="var(--accent)" />
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--t-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{(f.size / 1024).toFixed(0)}KB</span>
              <button onClick={e => { e.stopPropagation(); setFiles(p => p.filter((_, j) => j !== i)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 2 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--t-muted)', marginBottom: 10 }}>— or paste questions below —</div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        style={{ width: '100%', height: 140, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 14 }}
        placeholder="Paste exam questions here (one per line or numbered)..." />

      <button onClick={analyze} disabled={loading || (files.length === 0 && !text.trim())}
        style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing {files.length > 0 ? `${files.length} PDFs` : 'questions'}…</> : '🔍 Analyze with AI'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── MOCK TEST PHASE ───────────────────────────────────────────────────────
  if (mockPhase === 'test' && mockData) {
    const qs = mockData.questions || []
    const q = qs[mockCurrent]
    if (!q) return null
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={() => setMockPhase('config')} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12 }}>← Back</button>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Q {mockCurrent + 1} / {qs.length}</span>
          <button onClick={submitMock} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12 }}>Submit</button>
        </div>
        <div style={{ height: 4, background: 'var(--b-subtle)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ width: `${((mockCurrent + 1) / qs.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: 'rgba(124,111,255,0.1)', color: 'var(--accent)' }}>{q.topic}</span>
            {q.pyqSource && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--t-muted)' }}>{q.pyqSource}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 18 }}>{q.question}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.options || []).map((opt, i) => (
              <div key={i} onClick={() => setMockAnswers(p => ({ ...p, [q.id]: opt }))}
                style={{ padding: '11px 15px', borderRadius: 9, border: `1px solid ${mockAnswers[q.id] === opt ? 'var(--blue)' : 'var(--b-default)'}`, background: mockAnswers[q.id] === opt ? 'var(--blue-bg)' : 'var(--bg-subtle)', cursor: 'pointer', color: mockAnswers[q.id] === opt ? 'var(--blue)' : 'var(--t-primary)', fontSize: 13.5, transition: 'all 0.15s' }}>
                {opt}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMockCurrent(p => Math.max(0, p - 1))} disabled={mockCurrent === 0} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12.5 }}>← Prev</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => mockCurrent < qs.length - 1 ? setMockCurrent(p => p + 1) : submitMock()}
            style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
            {mockCurrent < qs.length - 1 ? 'Next →' : 'Submit 🎯'}
          </button>
        </div>
      </div>
    )
  }

  if (mockPhase === 'results' && mockResults) return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 72, fontWeight: 900, fontFamily: 'JetBrains Mono', color: mockResults.score >= 70 ? 'var(--mint)' : 'var(--amber)', lineHeight: 1, marginBottom: 8 }}>{mockResults.score}%</div>
      <div style={{ fontSize: 14, color: 'var(--t-secondary)', marginBottom: 24 }}>{mockResults.correct} correct · {mockResults.wrong} wrong · {mockResults.total} total</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={() => { setMockPhase('config'); setMockData(null); setMockResults(null) }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 13 }}>← Back to Analysis</button>
        <button onClick={generatePYQMock} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>🔄 New Test</button>
      </div>
    </div>
  )

  // ── ANALYSIS SCREEN ───────────────────────────────────────────────────────
  const tabs = ['overview', 'topics', 'questions', 'predictions', 'mock']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📊 PYQ Analysis</h1>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={() => { setTab('mock') }} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🎯 PYQ Mock Test</button>
          <button onClick={() => { setData(null); setText(''); setFiles([]); storage.remove('pyq') }} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', fontSize: 12, cursor: 'pointer' }}>🔄 Re-analyze</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--bg-subtle)', padding: 3, borderRadius: 9, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--t-secondary)', textTransform: 'capitalize' }}>
            {t === 'mock' ? '🎯 Mock' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[['Questions', data.totalQuestions || data.questions?.length || '?', 'var(--accent)'], ['Years', data.yearsAnalyzed?.length || '?', 'var(--amber)'], ['Topics', data.topicFrequency?.length || '?', 'var(--mint)'], ['Subjects', data.subjectsFound?.length || data.subjectWise?.length || '?', 'var(--blue)']].map(([label, val, color]) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '13px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'JetBrains Mono' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Overview text */}
          {data.overview && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 7 }}>📋 Overall Summary</div>
              <p style={{ fontSize: 13, color: 'var(--t-primary)', lineHeight: 1.65, margin: 0 }}>{data.overview}</p>
            </div>
          )}

          {/* Subject breakdown */}
          {data.subjectWise?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>Subject Distribution</div>
              {data.subjectWise.map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.subject}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--t-muted)' }}>{s.count} Qs · {s.percentage}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${s.percentage}%`, height: '100%', background: `hsl(${220 + i * 35}, 70%, 60%)`, borderRadius: 99 }} />
                  </div>
                  {s.keyTopics?.length > 0 && (
                    <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.keyTopics.slice(0, 4).map((t, j) => <span key={j} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--t-muted)', border: '1px solid var(--b-subtle)' }}>{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Most repeated */}
          {data.mostRepeatedQuestions?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>🔄 Most Repeated Questions</div>
              {data.mostRepeatedQuestions.map((q, i) => (
                <div key={i} style={{ padding: '9px 11px', background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 7, borderLeft: '3px solid var(--amber)' }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 5 }}>{q.text}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--amber)', fontWeight: 600 }}>Appeared {q.times}x</span>
                    <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{q.topic}</span>
                    {q.years?.length > 0 && <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>· {q.years.join(', ')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patterns */}
          {data.questionPatterns?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>📐 Question Patterns</div>
              {data.questionPatterns.map((p, i) => (
                <div key={i} style={{ fontSize: 12.5, color: 'var(--t-secondary)', marginBottom: 7, paddingLeft: 11, borderLeft: '2px solid var(--accent)', lineHeight: 1.55 }}>{p}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TOPICS TAB ── */}
      {tab === 'topics' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.topicFrequency?.map((t, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.topic}</span>
                    {t.subject && <span style={{ fontSize: 11, color: 'var(--t-muted)', marginLeft: 8 }}>{t.subject}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: t.trend === 'Rising' ? 'var(--mint)' : t.trend === 'Falling' ? 'var(--rose)' : 'var(--t-muted)', fontWeight: 600 }}>
                      {t.trend === 'Rising' ? '↑' : t.trend === 'Falling' ? '↓' : '→'} {t.trend}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{t.count}Q</span>
                    <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{t.percentage}%</span>
                  </div>
                </div>
                <div style={{ height: 5, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(t.count / maxFreq) * 100}%`, height: '100%', background: `hsl(${220 + i * 18}, 70%, 60%)`, borderRadius: 99 }} />
                </div>
                {t.years?.length > 0 && <div style={{ marginTop: 5, fontSize: 10.5, color: 'var(--t-muted)' }}>Years: {t.years.join(', ')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUESTIONS TAB ── */}
      {tab === 'questions' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <select value={filter.topic} onChange={e => setFilter(p => ({ ...p, topic: e.target.value }))}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 12 }}>
              {allTopics.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={filter.difficulty} onChange={e => setFilter(p => ({ ...p, difficulty: e.target.value }))}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 12 }}>
              {['All', 'Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={filter.year} onChange={e => setFilter(p => ({ ...p, year: e.target.value }))}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 12 }}>
              {allYears.map(y => <option key={y}>{y}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--t-muted)', lineHeight: '32px' }}>{filteredQs.length} found</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
            {filteredQs.map((q, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 9, padding: '11px 13px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: q.difficulty === 'Easy' ? 'rgba(78,205,196,0.15)' : q.difficulty === 'Hard' ? 'rgba(255,107,157,0.15)' : 'rgba(240,165,0,0.15)', color: q.difficulty === 'Easy' ? 'var(--mint)' : q.difficulty === 'Hard' ? 'var(--rose)' : 'var(--amber)', fontWeight: 600 }}>{q.difficulty}</span>
                  <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue)' }}>{q.topic}</span>
                  {q.year && <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{q.year}</span>}
                  {q.marks && <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{q.marks}M</span>}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65 }}>{q.text}</div>
              </div>
            ))}
            {filteredQs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--t-muted)', fontSize: 13, padding: 30 }}>No questions match filters</p>}
          </div>
        </div>
      )}

      {/* ── PREDICTIONS TAB ── */}
      {tab === 'predictions' && (
        <div>
          {data.upcomingPredictions && (
            <div style={{ background: 'rgba(124,111,255,0.07)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 11, padding: '13px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 7 }}>🔮 Upcoming Exam Predictions</div>
              <p style={{ fontSize: 13, color: 'var(--t-secondary)', lineHeight: 1.65, margin: 0 }}>{data.upcomingPredictions}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.predictedHighValueTopics?.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: `1px solid var(--b-default)`, borderLeft: `3px solid ${i < 3 ? 'var(--rose)' : i < 6 ? 'var(--amber)' : 'var(--mint)'}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono', color: i < 3 ? 'var(--rose)' : i < 6 ? 'var(--amber)' : 'var(--mint)', flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.topic}</div>
                    {item.subject && <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>{item.subject}</div>}
                    {item.reason && <div style={{ fontSize: 12, color: 'var(--t-secondary)', marginTop: 5, lineHeight: 1.5 }}>{item.reason}</div>}
                    {item.similarPastQ && <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 4, fontStyle: 'italic' }}>📎 {item.similarPastQ}</div>}
                  </div>
                  {item.probability && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{item.probability}%</span>}
                </div>
                {item.probability && (
                  <div style={{ height: 4, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${item.probability}%`, height: '100%', background: i < 3 ? 'var(--rose)' : i < 6 ? 'var(--amber)' : 'var(--mint)', borderRadius: 99 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.studyRecommendations?.length > 0 && (
            <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>📚 Study Recommendations</div>
              {data.studyRecommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '8px 10px', background: 'rgba(124,111,255,0.05)', borderRadius: 8, borderLeft: '2px solid var(--accent)', marginBottom: 7, fontSize: 12.5, color: 'var(--t-secondary)', lineHeight: 1.55 }}>
                  <span>💡</span><span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MOCK TAB ── */}
      {tab === 'mock' && mockPhase === 'config' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-primary)', marginBottom: 5 }}>🎯 PYQ-Based Mock Test Creator</div>
          <p style={{ fontSize: 12.5, color: 'var(--t-muted)', marginBottom: 20, lineHeight: 1.55 }}>
            AI creates a custom test based on your uploaded PYQs — similar questions, predicted topics, or a smart mix.
          </p>

          {/* Test type */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 10 }}>Test Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['similar', '📝 Similar to PYQs', 'Questions in the same style and difficulty as past papers'],
                ['predicted', '🔮 Predicted Questions', 'AI-generated questions on topics likely to appear next'],
                ['mixed', '🎲 Smart Mix', 'Best of both — past patterns + future predictions'],
              ].map(([t, label, desc]) => (
                <div key={t} onClick={() => setMockType(t)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${mockType === t ? 'var(--blue)' : 'var(--b-default)'}`, background: mockType === t ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${mockType === t ? 'var(--blue)' : 'var(--b-strong)'}`, background: mockType === t ? 'var(--blue)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mockType === t && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-primary)' }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t-muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 7 }}>Number of Questions: {mockCount}</div>
            <input type="range" min="5" max="30" step="5" value={mockCount} onChange={e => setMockCount(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          <button onClick={generatePYQMock} disabled={mockLoading}
            style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: mockLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {mockLoading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating PYQ Test…</> : '🎯 Create Practice Test'}
          </button>

          {data.examStrategy && (
            <div style={{ marginTop: 20, background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 11, padding: '13px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 7 }}>⚡ Exam Strategy</div>
              <p style={{ fontSize: 12.5, color: 'var(--t-secondary)', lineHeight: 1.65, margin: 0 }}>{data.examStrategy}</p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
