import React, { useEffect, useState } from 'react'
import { BarChart2, TrendingUp } from 'lucide-react'
import { storage, callClaude, showToast, getSubjectColor } from '../utils/index.js'

function HeatMap({ sessions }) {
  const today = new Date()
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (27 - i))
    const dateStr = d.toISOString().split('T')[0]
    const daySessions = sessions.filter(s => s.date === dateStr)
    const mins = daySessions.reduce((a, s) => a + (s.duration || 0), 0)
    const level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4
    return { dateStr, mins, level }
  })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div className="heatmap">
        {cells.map((c, i) => (
          <div key={i} className={`heat-cell ${c.level > 0 ? `l${c.level}` : ''}`} title={`${c.dateStr}: ${c.mins}m`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Less</span>
        {[0,1,2,3,4].map(l => <div key={l} className={`heat-cell ${l > 0 ? `l${l}` : ''}`} style={{ width: 10, height: 10, borderRadius: 2 }} />)}
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  )
}

export default function Progress({ profile }) {
  const [stats, setStats] = useState({})
  const [aiTips, setAiTips] = useState({})
  const [loadingTip, setLoadingTip] = useState(null)

  useEffect(() => {
    const notes = storage.get('notes', [])
    const sessions = storage.get('focussessions', [])
    const flashcardSessions = storage.get('flashcards', [])
    const tests = storage.get('mocktests', [])
    const tasks = storage.get('studyplan', []).flatMap(d => d.tasks || [])
    const streak = storage.get('streak', {})

    const totalMins = sessions.reduce((a, s) => a + (s.duration || 0), 0)
    const completedTasks = tasks.filter(t => t.done).length
    const avgScore = tests.length ? Math.round(tests.reduce((a, t) => a + (t.score || 0), 0) / tests.length) : 0

    // Per-subject stats
    const subjectStats = {}
    ;(profile?.subjects || []).forEach(s => {
      const subTasks = tasks.filter(t => t.subject === s)
      const subSessions = sessions.filter(ses => ses.subject === s)
      subjectStats[s] = {
        tasksTotal: subTasks.length,
        tasksDone: subTasks.filter(t => t.done).length,
        studyMins: subSessions.reduce((a, ses) => a + (ses.duration || 0), 0),
      }
    })

    // Bar chart last 7 days
    const today = new Date()
    const dailyMins = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const mins = sessions.filter(s => s.date === dateStr).reduce((a, s) => a + (s.duration || 0), 0)
      return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), mins }
    })

    setStats({ totalMins, completedTasks, avgScore, subjectStats, dailyMins, streak, sessions, notes })
  }, [])

  const getAITip = async (subject) => {
    setLoadingTip(subject)
    const subStat = stats.subjectStats?.[subject] || {}
    const pct = subStat.tasksTotal ? Math.round((subStat.tasksDone / subStat.tasksTotal) * 100) : 0
    try {
      const text = await Promise.race([
        callClaude(`Give a specific 2-sentence study recommendation for a student studying ${subject} for ${profile?.examType || 'exam'}. They've completed ${pct}% of planned tasks. Be actionable.`),
        new Promise(resolve => setTimeout(() => resolve(null), 3500)),
      ])
      setAiTips(p => ({
        ...p,
        [subject]: text || 'AI tip is temporarily unavailable. Please try again shortly.'
      }))
    } finally {
      setLoadingTip(null)
    }
  }

  const maxMins = Math.max(...(stats.dailyMins?.map(d => d.mins) || [1]), 1)

  return (
    <div>
      <h1 className="section-title"> Progress Dashboard</h1>

      {/* Top Stats */}
      <div className="grid-4 mb-6">
        {[
          { label: 'Study Hours', value: Math.round((stats.totalMins || 0) / 60 * 10) / 10, unit: 'h', color: 'var(--accent)' },
          { label: 'Tasks Done', value: stats.completedTasks || 0, unit: '', color: 'var(--mint)' },
          { label: 'Avg Score', value: `${stats.avgScore || 0}`, unit: '%', color: 'var(--amber)' },
          { label: 'Streak', value: stats.streak?.streak || 0, unit: 'd', color: 'var(--rose)' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}<span style={{ fontSize: 16, color }}>{unit}</span></div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-6">
        {/* Weekly Activity */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Weekly Activity (minutes)</div>
          <svg width="100%" height="100" viewBox="0 0 300 100">
            {stats.dailyMins?.map((d, i) => {
              const barH = maxMins > 0 ? (d.mins / maxMins) * 70 : 0
              const x = i * 43 + 15
              return (
                <g key={i}>
                  <rect x={x} y={100 - barH - 20} width={28} height={Math.max(barH, 2)} rx={4} fill="var(--accent)" fillOpacity={d.mins > 0 ? 0.8 : 0.2} />
                  <text x={x + 14} y="95" textAnchor="middle" fill="var(--text-muted)" fontSize="9">{d.day}</text>
                  {d.mins > 0 && <text x={x + 14} y={100 - barH - 24} textAnchor="middle" fill="var(--accent)" fontSize="8">{d.mins}m</text>}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Heatmap */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>4-Week Study Heatmap</div>
          <HeatMap sessions={stats.sessions || []} />
        </div>
      </div>

      {/* Per-Subject */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Subject Progress</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(profile?.subjects || []).map(s => {
            const sub = stats.subjectStats?.[s] || {}
            const pct = sub.tasksTotal ? Math.round((sub.tasksDone / sub.tasksTotal) * 100) : 0
            const color = getSubjectColor(s, profile?.subjects)
            return (
              <div key={s}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.tasksDone || 0}/{sub.tasksTotal || 0} tasks · {sub.studyMins || 0}m studied</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color }}>{pct}%</span>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => getAITip(s)} disabled={loadingTip === s}>
                      {loadingTip === s ? '…' : ' AI Tip'}
                    </button>
                  </div>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
                <div style={{ marginTop: 8, padding: 10, background: 'rgba(124,111,255,0.05)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {aiTips[s] || `Focus on one weak topic in ${s} and turn it into 3 self-test questions before your next study block.`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
