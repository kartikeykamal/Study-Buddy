import React, { useState, useRef } from 'react'
import { BookOpen, Upload, RefreshCw, ChevronDown, ChevronUp, Zap, AlertTriangle, Star } from 'lucide-react'
import { callClaudeWithPDFs, callClaude, parseJSON, showToast, storage, syllabusStore, addXP, addNotification } from '../utils/index.js'

export default function SyllabusAnalyzer({ profile, onNavigate }) {
  const [data, setData] = useState(syllabusStore.get())
  const [files, setFiles] = useState([])
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [expandedTopic, setExpandedTopic] = useState(null)
  const fileRef = useRef()
  const dropRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    setFiles(prev => [...prev, ...dropped].slice(0, 3))
  }

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    setFiles(prev => [...prev, ...selected].slice(0, 3))
  }

  const analyze = async () => {
    if (files.length === 0 && !instructions.trim()) {
      showToast('Upload a PDF or enter syllabus text', 'warning'); return
    }
    setLoading(true)
    try {
      const examSubjects = profile?.subjects?.join(', ') || 'all subjects in the syllabus'
      const prompt = `You are analyzing a student's syllabus for ${profile?.examType || 'their exam'} on ${profile?.examDate || 'upcoming exam'}.
${instructions ? `Student notes: ${instructions}` : ''}
Subjects in course: ${examSubjects}.
Analyze and return ONLY valid JSON structured by SUBJECT (not just topic):
{
  "subjects": [
    {
      "name": "Subject Name (e.g. Mathematics, Physics, DSA)",
      "totalTopics": N,
      "estimatedHours": N,
      "overview": "2-3 sentence overview of what this subject covers and its exam importance",
      "highPriority": ["topic1", "topic2"],
      "topics": [
        {
          "name": "Topic Name",
          "chapter": "Chapter or Unit name",
          "weightage": "High/Medium/Low",
          "estimatedHours": N,
          "subtopics": ["subtopic1", "subtopic2"],
          "keyFormulas": ["formula or key concept"],
          "difficulty": "Easy/Medium/Hard"
        }
      ],
      "studyOrder": ["topic1", "topic2"],
      "weeklyPlan": [{ "week": 1, "topics": ["topic1"], "hours": N }],
      "examTips": ["subject-specific tip 1", "tip 2"],
      "importantFormulas": ["formula1"],
      "commonMistakes": ["mistake1"],
      "mockTestFocus": ["key area for mock test 1", "area 2"]
    }
  ],
  "totalEstimatedHours": N,
  "overallHighPriority": ["topic1","topic2"]
}
Group ALL topics under their correct subject. Be thorough.`

      let result
      if (files.length > 0) {
        result = await callClaudeWithPDFs(files, prompt, '', 6000)
      } else {
        result = await callClaude(`${instructions}\n\n${prompt}`, '', 6000)
      }

      const parsed = parseJSON(result)
      if (parsed && parsed.subjects?.length > 0) {
        syllabusStore.set(parsed)
        setData(parsed)
        setSelectedSubject(parsed.subjects[0]?.name || null)
        setTab('overview')
        addXP('syllabus')
        addNotification(`Syllabus analyzed! ${parsed.subjects.length} subjects found`, '')
        showToast('Syllabus analyzed successfully!', 'success')
      } else {
        showToast('Could not parse syllabus. Try again.', 'error')
      }
    } catch (e) {
      console.error(e)
      showToast('Analysis failed', 'error')
    }
    setLoading(false)
  }

  const weightColor = { High: 'var(--rose)', Medium: 'var(--amber)', Low: 'var(--mint)' }
  const weightBg = { High: 'rgba(255,107,107,0.08)', Medium: 'rgba(240,165,0,0.08)', Low: 'rgba(90,200,120,0.08)' }
  const diffColor = { Easy: 'var(--mint)', Medium: 'var(--amber)', Hard: 'var(--rose)' }

  const subjects = data?.subjects || []
  const activeSubject = subjects.find(s => s.name === selectedSubject) || subjects[0]

  // ── UPLOAD SCREEN ──────────────────────────────────────────────────────────
  if (!data) return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 className="section-title">Syllabus Analyzer</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13 }}>
        Upload your syllabus PDF. AI will analyze it subject-wise — generating topics, priorities, formulas, and exam strategy per subject.
      </p>

      <div ref={dropRef}
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed var(--border)', borderRadius: 16, padding: 40,
          textAlign: 'center', cursor: 'pointer', marginBottom: 20,
          transition: 'all 0.2s', background: 'var(--panel)',
        }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop syllabus PDF here</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>or click to browse — up to 3 PDFs</div>
        <input ref={fileRef} type="file" accept=".pdf" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--panel)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>📑</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{f.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(0)}KB</span>
              <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', fontSize: 16 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div className="label mb-2">Additional Instructions (optional)</div>
        <textarea className="input" style={{ height: 100, resize: 'none' }} value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="e.g. Focus on Unit 3 and 4. Exam is in 30 days. Subjects: DSA, OS, DBMS, CN..." />
      </div>

      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
        onClick={analyze} disabled={loading || (files.length === 0 && !instructions.trim())}>
        {loading ? '… Analyzing Syllabus…' : '🔍 Analyze with AI'}
      </button>
    </div>
  )

  // ── ANALYSIS SCREEN ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="section-title" style={{ margin: 0 }}>📚 Syllabus Analysis</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate?.('mocktest')}>🎯 Mock Test</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate?.('studyplan')}>📅 Study Plan</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setData(null); setFiles([]); syllabusStore.set(null) }}>🔄 Re-analyze</button>
        </div>
      </div>

      {/* Subject selector tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
        {subjects.map(s => (
          <button key={s.name} onClick={() => setSelectedSubject(s.name)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12.5,
            border: `1px solid ${selectedSubject === s.name ? 'var(--accent)' : 'var(--border)'}`,
            background: selectedSubject === s.name ? 'var(--accent-dim)' : 'transparent',
            color: selectedSubject === s.name ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', fontWeight: selectedSubject === s.name ? 600 : 400,
            transition: 'all 0.15s'
          }}>{s.name}</button>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--panel)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {['overview', 'topics', 'plan', 'tips', 'mock'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {t === 'mock' ? '🎯 Mock' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && activeSubject && (
        <div>
          {/* Subject overview card */}
          <div style={{ background: 'var(--panel)', borderRadius: 14, padding: '16px 18px', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{activeSubject.name}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{activeSubject.overview}</p>
          </div>

          {/* Stats */}
          <div className="grid-3 mb-4">
            <div className="stat-card"><div className="stat-value">{activeSubject.totalTopics}</div><div className="stat-label">Topics</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: 'var(--amber)' }}>{activeSubject.estimatedHours}h</div><div className="stat-label">Est. Hours</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: 'var(--rose)' }}>{activeSubject.highPriority?.length || 0}</div><div className="stat-label">High Priority</div></div>
          </div>

          {/* High priority topics */}
          <div className="card mb-4">
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>🔥 High Priority Topics — {activeSubject.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeSubject.highPriority?.map((t, i) => (
                <span key={i} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,107,157,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,107,157,0.2)' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Formulas */}
          {activeSubject.importantFormulas?.length > 0 && (
            <div className="card mb-4">
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>📐 Important Formulas / Concepts — {activeSubject.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {activeSubject.importantFormulas.map((f, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: 'rgba(124,111,255,0.07)', borderRadius: 8, borderLeft: '3px solid var(--accent)', fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* Common mistakes */}
          {activeSubject.commonMistakes?.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>⚠️ Common Mistakes — {activeSubject.name}</div>
              {activeSubject.commonMistakes.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'rgba(240,165,0,0.05)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>⚠</span><span>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TOPICS TAB ── */}
      {tab === 'topics' && activeSubject && (
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            {activeSubject.totalTopics} topics · {activeSubject.estimatedHours}h estimated — {activeSubject.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeSubject.topics?.map((t, i) => (
              <div key={i} className="card" style={{ borderLeft: `3px solid ${weightColor[t.weightage] || 'var(--border)'}`, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpandedTopic(expandedTopic === i ? null : i)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.name}</div>
                      {t.chapter && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.chapter}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: weightBg[t.weightage], color: weightColor[t.weightage] }}>{t.weightage}</span>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${diffColor[t.difficulty]}22`, color: diffColor[t.difficulty] }}>{t.difficulty}</span>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'var(--panel)', color: 'var(--text-muted)' }}>{t.estimatedHours}h</span>
                      {expandedTopic === i ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
                    </div>
                  </div>
                  {t.subtopics?.length > 0 && !expandedTopic === i && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {t.subtopics.slice(0, 3).map((s, j) => <span key={j} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--panel)', color: 'var(--text-secondary)' }}>{s}</span>)}
                      {t.subtopics.length > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{t.subtopics.length - 3} more</span>}
                    </div>
                  )}
                </div>

                {expandedTopic === i && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--panel)' }}>
                    {t.subtopics?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtopics</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {t.subtopics.map((s, j) => <span key={j} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{s}</span>)}
                        </div>
                      </div>
                    )}
                    {t.keyFormulas?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Formulas / Concepts</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {t.keyFormulas.map((f, j) => (
                            <div key={j} style={{ padding: '7px 10px', background: 'rgba(124,111,255,0.07)', borderRadius: 7, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--accent)', borderLeft: '2px solid var(--accent)' }}>{f}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PLAN TAB ── */}
      {tab === 'plan' && activeSubject && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Recommended study sequence for <strong>{activeSubject.name}</strong></div>

          {/* Study order */}
          <div className="card mb-4">
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>📋 Optimal Study Order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeSubject.studyOrder?.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--panel)', borderRadius: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly plan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeSubject.weeklyPlan?.map((w, i) => (
              <div key={i} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Week {w.week} — {activeSubject.name}</div>
                  <span style={{ fontSize: 12, color: 'var(--amber)' }}>{w.hours}h planned</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {w.topics?.map((t, j) => <span key={j} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--panel)', color: 'var(--text-secondary)' }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TIPS TAB ── */}
      {tab === 'tips' && activeSubject && (
        <div>
          <div className="card mb-4">
            <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 13 }}>💡 Exam Tips — {activeSubject.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeSubject.examTips?.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(124,111,255,0.05)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {activeSubject.commonMistakes?.length > 0 && (
            <div className="card mb-4">
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>⚠️ Watch Out — {activeSubject.name}</div>
              {activeSubject.commonMistakes.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'rgba(240,165,0,0.05)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>⚠</span><span>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MOCK TAB ── */}
      {tab === 'mock' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Select a subject to start a subject-specific mock test</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map(s => (
              <div key={s.name} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                    <span>{s.totalTopics} topics</span>
                    <span>·</span>
                    <span>{s.highPriority?.length || 0} high priority</span>
                  </div>
                  {s.mockTestFocus?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.mockTestFocus.slice(0, 3).map((f, i) => (
                        <span key={i} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,111,255,0.08)', color: 'var(--accent)', border: '1px solid rgba(124,111,255,0.15)' }}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onNavigate?.('mocktest', { subject: s.name, topics: s.highPriority })}>
                  Start Test →
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: 14, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Take a combined test across all subjects</div>
            <button className="btn btn-primary" onClick={() => onNavigate?.('mocktest')}>🎯 Full Mock Test</button>
          </div>
        </div>
      )}
    </div>
  )
}
