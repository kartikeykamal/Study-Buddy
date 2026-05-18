import React, { useState, useEffect } from 'react'
import { RefreshCw, Download, Plus, Clock, ChevronDown, ChevronUp, Check, MapPin, BookOpen, Target, Zap } from 'lucide-react'
import { storage, callClaude, parseJSON, showToast, daysUntil, getSubjectColor, addXP, addNotification, todayStr } from '../utils/index.js'

export default function StudyPlan({ profile }) {
  const [plan, setPlan] = useState([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [expandedTask, setExpandedTask] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({ topic: '', subject: profile?.subjects?.[0] || '', estimatedMinutes: 45, difficulty: 'Medium' })
  const [view, setView] = useState('day') // 'day' | 'week'

  useEffect(() => {
    const saved = storage.get('studyplan', [])
    if (saved.length) { setPlan(saved); return }
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i)
      return { day: i + 1, date: d.toISOString().split('T')[0], tasks: [] }
    })
    setPlan(days); storage.set('studyplan', days)
  }, [])

  const currentDay = plan[selectedDay]
  const tasks = currentDay?.tasks || []
  const done = tasks.filter(t => t.done).length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  // Per-subject completion across full week
  const subjectStats = () => {
    const map = {}
    plan.forEach(d => (d.tasks || []).forEach(t => {
      if (!map[t.subject]) map[t.subject] = { total: 0, done: 0 }
      map[t.subject].total++
      if (t.done) map[t.subject].done++
    }))
    return map
  }

  const toggleTask = (idx) => {
    const updated = plan.map((d, di) => di !== selectedDay ? d : {
      ...d, tasks: d.tasks.map((t, ti) => ti !== idx ? t : { ...t, done: !t.done })
    })
    setPlan(updated); storage.set('studyplan', updated)
    if (!tasks[idx].done) { addXP('task'); addNotification(`Task completed: ${tasks[idx].topic}`, '') }
  }

  const togglePointDone = (taskIdx, pointIdx) => {
    const updated = plan.map((d, di) => di !== selectedDay ? d : {
      ...d, tasks: d.tasks.map((t, ti) => {
        if (ti !== taskIdx) return t
        const points = t.points ? [...t.points] : []
        if (points[pointIdx]) points[pointIdx] = { ...points[pointIdx], done: !points[pointIdx].done }
        const allDone = points.length > 0 && points.every(p => p.done)
        return { ...t, points, done: allDone }
      })
    })
    setPlan(updated); storage.set('studyplan', updated)
  }

  const regenerate = async () => {
    if (!profile) return
    setGenerating(true)
    const days = daysUntil(profile.examDate)
    const completedTopics = plan.flatMap(d => d.tasks.filter(t => t.done).map(t => t.topic)).slice(0, 20)
    const subjects = profile.subjects?.join(', ') || 'General'

    const prompt = `You are a study plan expert for ${profile.examType} exam on ${profile.examDate} (${days} days away).
Subjects: ${subjects}. Completed: ${completedTopics.join(', ') || 'none'}.
Generate an optimized FULL 7-DAY study plan. For each day create 3-5 tasks.
Each task must have a "points" array — specific sub-topics or action items the student must cover.
Return ONLY valid JSON:
[
  {
    "day": 1,
    "date": "YYYY-MM-DD",
    "tasks": [
      {
        "topic": "Topic Name",
        "subject": "Subject Name",
        "estimatedMinutes": 45,
        "difficulty": "Medium",
        "description": "Brief overview of the task",
        "points": [
          { "text": "Specific point or concept to cover", "done": false },
          { "text": "Another sub-topic", "done": false }
        ]
      }
    ]
  }
]
Generate all 7 days. Points array should have 3-5 items per task. Keep subject names exactly as: ${subjects}.`

    const text = await callClaude(prompt, '', 4096)
    if (!text) {
      showToast('AI unavailable — try again', 'error')
      setGenerating(false)
      return
    }

    const parsed = parseJSON(text, null)
    const newPlan = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.days) ? parsed.days : Array.isArray(parsed?.plan) ? parsed.plan : [])

    if (newPlan.length) {
      const today = new Date()
      const merged = newPlan.slice(0, 7).map((d, i) => {
        const date = new Date(today); date.setDate(today.getDate() + i)
        return { ...d, date: date.toISOString().split('T')[0], tasks: d.tasks || [] }
      })
      setPlan(merged); storage.set('studyplan', merged)
      showToast('7-day plan generated!', 'success')
    } else {
      showToast('Could not parse plan — try again', 'error')
    }
    setGenerating(false)
  }

  const addTask = () => {
    if (!newTask.topic) { showToast('Enter a topic', 'warning'); return }
    const updated = plan.map((d, i) => i !== selectedDay ? d : {
      ...d, tasks: [...d.tasks, { ...newTask, id: Date.now(), done: false, points: [] }]
    })
    setPlan(updated); storage.set('studyplan', updated)
    setAddingTask(false); setNewTask({ topic: '', subject: profile?.subjects?.[0] || '', estimatedMinutes: 45, difficulty: 'Medium' })
    showToast('Task added', 'success')
  }

  const exportPlan = () => {
    const txt = plan.map(d => `## ${d.date}\n${(d.tasks || []).map(t =>
      `- [${t.done ? 'x' : ' '}] ${t.topic} (${t.subject}, ${t.estimatedMinutes}min, ${t.difficulty})\n` +
      (t.points?.map(p => `    - [${p.done ? 'x' : ' '}] ${p.text}`).join('\n') || '')
    ).join('\n')}`).join('\n\n')
    const blob = new Blob([txt], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'study-plan.md'; a.click()
  }

  const diffColor = { Easy: 'var(--green)', Medium: 'var(--ochre)', Hard: 'var(--terra)' }
  const diffBg = { Easy: 'var(--green-bg)', Medium: 'var(--ochre-bg)', Hard: 'var(--terra-bg)' }
  const diffBorder = { Easy: 'var(--green-border)', Medium: 'var(--ochre-border)', Hard: 'var(--terra-border)' }

  const subj = subjectStats()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Study Plan</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportPlan}>
            <Download size={13} strokeWidth={1.8} /> Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={regenerate} disabled={generating}>
            <RefreshCw size={13} strokeWidth={1.8} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
            {generating ? 'Generating…' : 'Generate Week Plan'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--bg-subtle)', padding: 3, borderRadius: 8, width: 'fit-content' }}>
        {['day', 'week'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 16px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
            fontWeight: view === v ? 600 : 400,
            background: view === v ? 'var(--bg-card)' : 'transparent',
            color: view === v ? 'var(--t-primary)' : 'var(--t-secondary)',
            boxShadow: view === v ? 'var(--sh-xs)' : 'none',
            textTransform: 'capitalize'
          }}>{v === 'day' ? 'Day View' : 'Week Overview'}</button>
        ))}
      </div>

      {/* WEEK OVERVIEW */}
      {view === 'week' && (
        <div>
          {/* Subject progress */}
          {Object.keys(subj).length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: 16, boxShadow: 'var(--sh-xs)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Progress</div>
              {Object.entries(subj).map(([s, v]) => {
                const p = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
                return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--t-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(s, profile?.subjects), display: 'inline-block' }} />
                        {s}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{v.done}/{v.total} · {p}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}><div className="progress-fill" style={{ width: `${p}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}

          {/* All 7 days */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.map((d, di) => {
              const isToday = d.date === todayStr()
              const dayTasks = d.tasks || []
              const dayDone = dayTasks.filter(t => t.done).length
              const dayPct = dayTasks.length ? Math.round((dayDone / dayTasks.length) * 100) : 0
              const label = isToday ? 'Today' : new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

              return (
                <div key={di} style={{
                  background: 'var(--bg-card)', border: `1px solid ${isToday ? 'var(--blue-border)' : 'var(--b-default)'}`,
                  borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-xs)'
                }}>
                  {/* Day header */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: dayTasks.length ? '1px solid var(--b-subtle)' : 'none', background: isToday ? 'var(--blue-bg)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => { setView('day'); setSelectedDay(di) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isToday && <MapPin size={12} color="var(--blue)" strokeWidth={2} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: isToday ? 'var(--blue)' : 'var(--t-primary)' }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{dayTasks.length} tasks</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--t-secondary)' }}>{dayDone}/{dayTasks.length} done</span>
                      <div style={{ width: 60, height: 4, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${dayPct}%`, height: '100%', background: 'var(--blue)', borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>{dayPct}%</span>
                    </div>
                  </div>

                  {/* Subject tags */}
                  {dayTasks.length > 0 && (
                    <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {dayTasks.map((t, ti) => (
                        <span key={ti} style={{
                          fontSize: 11, padding: '2px 9px', borderRadius: 20,
                          background: t.done ? 'var(--bg-subtle)' : 'var(--b-subtle)',
                          color: t.done ? 'var(--t-ghost)' : 'var(--t-secondary)',
                          textDecoration: t.done ? 'line-through' : 'none',
                          border: '1px solid var(--b-subtle)'
                        }}>
                          {t.topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div>
          {/* Day pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
            {plan.map((d, i) => {
              const isToday = d.date === todayStr()
              const dayDone = (d.tasks || []).filter(t => t.done).length
              const active = selectedDay === i
              return (
                <button key={i} onClick={() => setSelectedDay(i)} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${active ? 'var(--blue-border)' : 'var(--b-default)'}`,
                  background: active ? 'var(--blue-bg)' : isToday ? 'var(--bg-card)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--t-secondary)',
                  cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--f-body)',
                }}>
                  {isToday && <MapPin size={11} strokeWidth={2} />}
                  {isToday ? 'Today' : new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {d.tasks?.length > 0 && <span style={{ opacity: 0.55, fontSize: 11 }}>{dayDone}/{d.tasks.length}</span>}
                </button>
              )
            })}
          </div>

          {/* Day overall progress */}
          {tasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--t-secondary)' }}>Day Progress</span>
                <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>{done} of {tasks.length} done · {pct}%</span>
              </div>
              <div className="progress-bar" style={{ height: 5 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          )}

          {/* Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.length === 0 && !generating && (
              <div style={{ textAlign: 'center', padding: '52px 20px', background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 'var(--r-lg)', color: 'var(--t-muted)' }}>
                <RefreshCw size={28} strokeWidth={1.4} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--t-ghost)' }} />
                <p style={{ fontSize: 13.5 }}>No tasks yet — click <strong>Generate Week Plan</strong> to build your AI study plan.</p>
              </div>
            )}

            {tasks.map((task, idx) => {
              const points = task.points || []
              const pointsDone = points.filter(p => p.done).length
              const pointsPct = points.length ? Math.round((pointsDone / points.length) * 100) : null
              const isExpanded = expandedTask === idx

              return (
                <div key={idx} style={{
                  background: 'var(--bg-card)', border: `1px solid ${task.done ? 'var(--b-subtle)' : 'var(--b-default)'}`,
                  borderRadius: 'var(--r-lg)', overflow: 'hidden',
                  opacity: task.done ? 0.7 : 1, boxShadow: task.done ? 'none' : 'var(--sh-xs)',
                  transition: 'all 0.15s',
                }}>
                  {/* Task header */}
                  <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Checkbox */}
                    <button onClick={() => toggleTask(idx)} style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 2,
                      border: `1.5px solid ${task.done ? 'var(--blue)' : 'var(--b-strong)'}`,
                      background: task.done ? 'var(--blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      {task.done && <Check size={11} color="#fff" strokeWidth={2.5} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedTask(isExpanded ? null : idx)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(task.subject, profile?.subjects), flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, fontSize: 13.5, textDecoration: task.done ? 'line-through' : 'none', color: 'var(--t-primary)' }}>{task.topic}</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 500, padding: '1px 7px', borderRadius: 20,
                          background: diffBg[task.difficulty], color: diffColor[task.difficulty],
                          border: `1px solid ${diffBorder[task.difficulty]}`,
                        }}>{task.difficulty}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--t-ghost)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} strokeWidth={1.8} />{task.estimatedMinutes}m
                        </span>
                        {isExpanded ? <ChevronUp size={13} color="var(--t-ghost)" /> : <ChevronDown size={13} color="var(--t-ghost)" />}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--t-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={10} strokeWidth={1.8} />
                        {task.subject}
                        {points.length > 0 && (
                          <span style={{ color: 'var(--t-ghost)' }}>· {pointsDone}/{points.length} points</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Per-task progress bar (shows even when collapsed if points exist) */}
                  {points.length > 0 && (
                    <div style={{ padding: '0 16px 12px', paddingTop: isExpanded ? 0 : 0 }}>
                      <div style={{ height: 3, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pointsPct}%`, height: '100%', background: task.done ? 'var(--blue)' : 'var(--blue)', borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--b-subtle)', padding: '12px 16px' }}>
                      {task.description && (
                        <div style={{ fontSize: 12.5, color: 'var(--t-secondary)', lineHeight: 1.65, marginBottom: 14, padding: '9px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', border: '1px solid var(--b-subtle)' }}>
                          {task.description}
                        </div>
                      )}

                      {points.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Target size={10} strokeWidth={2} /> Points to Cover
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {points.map((pt, pi) => (
                              <div key={pi} onClick={() => togglePointDone(idx, pi)}
                                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: pt.done ? 'var(--bg-subtle)' : 'transparent', transition: 'background 0.1s' }}>
                                <div style={{
                                  width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                                  border: `1.5px solid ${pt.done ? 'var(--blue)' : 'var(--b-strong)'}`,
                                  background: pt.done ? 'var(--blue)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {pt.done && <Check size={9} color="#fff" strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: 12.5, color: pt.done ? 'var(--t-ghost)' : 'var(--t-primary)', textDecoration: pt.done ? 'line-through' : 'none' }}>{pt.text}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, color: 'var(--t-ghost)' }}>{pointsDone} of {points.length} covered</span>
                            <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>{pointsPct}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add Task */}
          <div style={{ marginTop: 12 }}>
            {addingTask ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--sh-sm)' }}>
                <div className="label">Topic</div>
                <input className="input mb-3" value={newTask.topic} onChange={e => setNewTask(p => ({ ...p, topic: e.target.value }))} placeholder="e.g. Newton's Laws of Motion" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div><div className="label">Subject</div>
                    <select className="select" style={{ width: '100%' }} value={newTask.subject} onChange={e => setNewTask(p => ({ ...p, subject: e.target.value }))}>
                      {(profile?.subjects || []).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><div className="label">Minutes</div>
                    <input className="input" type="number" value={newTask.estimatedMinutes} onChange={e => setNewTask(p => ({ ...p, estimatedMinutes: +e.target.value }))} />
                  </div>
                  <div><div className="label">Difficulty</div>
                    <select className="select" style={{ width: '100%' }} value={newTask.difficulty} onChange={e => setNewTask(p => ({ ...p, difficulty: e.target.value }))}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAddingTask(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={addTask}>Add Task</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAddingTask(true)}>
                <Plus size={14} strokeWidth={2} /> Add Task
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
