import React, { useState, useEffect } from 'react'
import { TrendingUp, Plus, Check, Sparkles, ChevronDown } from 'lucide-react'
import { storage, callClaude, daysUntil, getLevel, todayStr } from '../utils/index.js'

function ProfileWidget({ profile }) {
  const streak = storage.get('streak', {})
  const lvl = getLevel(streak.xp || 0)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--ink-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
          {(profile?.name?.[0] || 'S').toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{profile?.name || 'Scholar'}</div>
          <div style={{ fontSize: 11, color: 'var(--ochre)', marginTop: 1 }}>{lvl.name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>Level {lvl.level} · {streak.xp || 0} XP</span>
        <span style={{ fontSize: 11, color: 'var(--t-ghost)' }}>{lvl.xpToNext} to next</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${lvl.progress}%` }} /></div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { val: streak.streak || 0, lbl: 'Day Streak', color: 'var(--ochre)' },
          { val: streak.xp || 0, lbl: 'Total XP', color: 'var(--blue)' },
        ].map(({ val, lbl, color }) => (
          <div key={lbl} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--b-subtle)', borderRadius: 8, padding: '9px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 22, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 9.5, color: 'var(--t-ghost)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExamCountdown({ profile }) {
  const days = profile?.examDate ? daysUntil(profile.examDate) : null
  const pct = days != null ? Math.max(0, Math.min(100, (days / 365) * 100)) : 50
  const r = 48, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--ink-100)" strokeWidth="6" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--blue)" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 56 56)" />
        <text x="56" y="51" textAnchor="middle" fill="var(--t-primary)" fontSize="21" fontWeight="400" fontFamily="Instrument Serif, serif" fontStyle="italic">{days ?? '?'}</text>
        <text x="56" y="66" textAnchor="middle" fill="var(--t-ghost)" fontSize="9" fontFamily="Outfit, sans-serif" letterSpacing="1">DAYS LEFT</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{profile?.examType || 'Exam'}</div>
        <div style={{ fontSize: 11.5, color: 'var(--t-muted)', marginTop: 2 }}>{profile?.examDate || '—'}</div>
      </div>
    </div>
  )
}

function SubjectProgress({ profile }) {
  const tasks = storage.get('studyplan', []).flatMap(d => d.tasks || [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {(profile?.subjects || []).map((s, i) => {
        const sub = tasks.filter(t => t.subject === s), done = sub.filter(t => t.done).length
        const pct = sub.length ? Math.round((done / sub.length) * 100) : 0
        const colors = ['var(--blue)', 'var(--ochre)', 'var(--green)', 'var(--terra)']
        return (
          <div key={s}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: 'var(--t-secondary)' }}>{s}</span>
              <span style={{ fontSize: 11, color: 'var(--t-ghost)' }}>{pct}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} /></div>
          </div>
        )
      })}
    </div>
  )
}

function AITipWidget({ profile }) {
  const [tip, setTip] = useState(storage.get('daily_tip', null))
  useEffect(() => {
    const today = todayStr(), cached = storage.get('daily_tip')
    if (cached?.date === today) { setTip(cached.tip); return }
    const subject = profile?.subjects?.[0] || 'general studies'
    callClaude(`Give a single practical study tip for a student studying ${subject} for ${profile?.examType || 'an exam'}. Make it specific, actionable, under 60 words.`)
      .then(t => { if (t) { storage.set('daily_tip', { tip: t, date: today }); setTip(t) } })
  }, [])
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <Sparkles size={13} color="var(--ochre)" strokeWidth={2} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ochre)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tip of the Day</span>
      </div>
      {tip
        ? <p style={{ fontSize: 12.5, color: 'var(--t-secondary)', lineHeight: 1.7 }}>{tip}</p>
        : <p style={{ fontSize: 12.5, color: 'var(--t-ghost)' }}>Fetching tip…</p>
      }
    </div>
  )
}

function TodoWidget() {
  const [tasks, setTasks] = useState(storage.get('tasks', []))
  const [input, setInput] = useState('')
  const add = () => {
    if (!input.trim()) return
    const updated = [...tasks, { id: Date.now(), text: input.trim(), done: false }]
    setTasks(updated); storage.set('tasks', updated); setInput('')
  }
  const toggle = id => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(updated); storage.set('tasks', updated)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input className="input" style={{ flex: 1, padding: '5px 9px', fontSize: 12.5 }} value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add task…" />
        <button className="btn btn-primary btn-sm btn-icon" onClick={add} style={{ padding: '5px 9px' }}>
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
        {tasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggle(t.id)}>
            <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${t.done ? 'var(--blue)' : 'var(--b-strong)'}`, background: t.done ? 'var(--blue)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.done && <Check size={9} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 12.5, color: t.done ? 'var(--t-ghost)' : 'var(--t-secondary)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--t-ghost)' }}>No tasks yet</p>}
      </div>
    </div>
  )
}

const WIDGETS = ['Profile Stats', 'Exam Countdown', 'Subject Progress', 'To-Do', 'AI Tip']

export default function RightPanel({ profile }) {
  const [top, setTop] = useState('Profile Stats')
  const [bottom, setBottom] = useState('Exam Countdown')
  const [showTop, setShowTop] = useState(false)
  const [showBot, setShowBot] = useState(false)

  const renderWidget = name => {
    switch (name) {
      case 'Profile Stats':    return <ProfileWidget profile={profile} />
      case 'Exam Countdown':   return <ExamCountdown profile={profile} />
      case 'Subject Progress': return <SubjectProgress profile={profile} />
      case 'To-Do':            return <TodoWidget />
      case 'AI Tip':           return <AITipWidget profile={profile} />
    }
  }

  const Slot = ({ value, onChange, open, setOpen }) => (
    <div className="widget-slot">
      <div className="widget-header">
        <span className="widget-title">{value}</span>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 10.5, gap: 3 }} onClick={() => setOpen(p => !p)}>
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {open && (
            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 'var(--r-md)', overflow: 'hidden', minWidth: 148, marginTop: 4, boxShadow: 'var(--sh-md)' }}>
              {WIDGETS.map(w => (
                <div key={w} style={{ padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', color: w === value ? 'var(--blue)' : 'var(--t-secondary)', fontWeight: w === value ? 500 : 400 }}
                  onClick={() => { onChange(w); setOpen(false) }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{w}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="widget-body">{renderWidget(value)}</div>
    </div>
  )

  return (
    <div className="right-panel">
      <Slot value={top} onChange={setTop} open={showTop} setOpen={setShowTop} />
      <Slot value={bottom} onChange={setBottom} open={showBot} setOpen={setShowBot} />
    </div>
  )
}
