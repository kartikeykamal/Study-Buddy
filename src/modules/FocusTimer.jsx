import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Timer } from 'lucide-react'
import { storage, callClaude, showToast, addXP, addNotification, todayStr } from '../utils/index.js'

const MODES = {
  pomodoro: { work: 25, break: 5, label: 'Pomodoro' },
  long: { work: 50, break: 10, label: 'Long Focus' },
  custom: { work: 30, break: 5, label: 'Custom' },
}

export default function FocusTimer({ profile }) {
  const [mode, setMode] = useState('pomodoro')
  const [customWork, setCustomWork] = useState(30)
  const [customBreak, setCustomBreak] = useState(5)
  const [subject, setSubject] = useState(profile?.subjects?.[0] || '')
  const [phase, setPhase] = useState('idle') // idle, work, break
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [total, setTotal] = useState(25 * 60)
  const [sessions, setSessions] = useState([])
  const [tip, setTip] = useState(null)
  const [autoBreak, setAutoBreak] = useState(3)
  const timerRef = useRef(null)
  const audioCtx = useRef(null)

  useEffect(() => {
    setSessions(storage.get('focussessions', []))
  }, [])

  const getWorkTime = () => mode === 'custom' ? customWork * 60 : MODES[mode].work * 60
  const getBreakTime = () => mode === 'custom' ? customBreak * 60 : MODES[mode].break * 60

  const playChime = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx.current
      ;[523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.8)
        osc.start(ctx.currentTime + i * 0.25)
        osc.stop(ctx.currentTime + i * 0.25 + 0.8)
      })
    } catch {}
  }

  const requestNotification = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const sendNotification = (msg) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('StudyBuddy', { body: msg, icon: '' })
    }
    playChime()
  }

  const logSession = (durationMin) => {
    const session = { id: Date.now(), subject, mode, duration: durationMin, date: todayStr(), time: new Date().toISOString() }
    const updated = [session, ...sessions].slice(0, 100)
    setSessions(updated); storage.set('focussessions', updated)
    addXP('task'); addNotification(`Focus session complete: ${durationMin}m of ${subject}`, '')
  }

  const start = async () => {
    requestNotification()
    const workTime = getWorkTime()
    setTotal(workTime); setTimeLeft(workTime); setPhase('work')
    // Fetch break tip
    callClaude(`Give one quick study technique tip for ${subject} in under 40 words. Be specific and practical.`).then(t => setTip(t))
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          if (phase === 'work' || true) {
            // We check phase via closure so use a callback approach
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (phase === 'work' && timeLeft === 0) {
      sendNotification('Work session complete! Time for a break ')
      logSession(Math.round(getWorkTime() / 60))
      const breakTime = getBreakTime()
      setTotal(breakTime); setPhase('break')
      let countdown = 3
      const id = setInterval(() => {
        setAutoBreak(countdown--)
        if (countdown < 0) {
          clearInterval(id)
          setTimeLeft(breakTime)
          timerRef.current = setInterval(() => {
            setTimeLeft(p => {
              if (p <= 1) { clearInterval(timerRef.current); setPhase('done'); return 0 }
              return p - 1
            })
          }, 1000)
        }
      }, 1000)
    }
    if (phase === 'break' && timeLeft === 0) {
      sendNotification('Break over! Ready to study? ')
      setPhase('done')
    }
  }, [timeLeft, phase])

  const pause = () => { clearInterval(timerRef.current) }
  const resume = () => {
    timerRef.current = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); return 0 } return p - 1 }), 1000)
  }
  const reset = () => {
    clearInterval(timerRef.current)
    setPhase('idle'); setTimeLeft(getWorkTime()); setTotal(getWorkTime())
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // SVG ring
  const SIZE = 280, R = 110, CIRC = 2 * Math.PI * R
  const pct = total > 0 ? timeLeft / total : 1
  const offset = CIRC - pct * CIRC
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isWorking = phase === 'work'
  const ringColor = phase === 'break' ? 'var(--mint)' : phase === 'done' ? 'var(--amber)' : 'var(--accent)'

  const todaySessions = sessions.filter(s => s.date === todayStr())
  const todayMins = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 className="section-title">Focus Timer</h1>

      {/* Mode + Config */}
      {phase === 'idle' && (
        <div className="card mb-6">
          <div className="grid-3 mb-4">
            {Object.entries(MODES).map(([k, v]) => (
              <button key={k} onClick={() => { setMode(k); setTimeLeft(v.work * 60); setTotal(v.work * 60) }}
                style={{ padding: '10px', borderRadius: 10, border: `1px solid ${mode === k ? 'var(--accent)' : 'var(--border)'}`, background: mode === k ? 'var(--accent-dim)' : 'transparent', color: mode === k ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: mode === k ? 600 : 400 }}>
                <div>{v.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{k === 'custom' ? `${customWork}m / ${customBreak}m` : `${v.work}m / ${v.break}m`}</div>
              </button>
            ))}
          </div>
          {mode === 'custom' && (
            <div className="grid-2 mb-4">
              <div><div className="label">Work: {customWork}m</div><input type="range" min="5" max="120" step="5" value={customWork} onChange={e => { setCustomWork(+e.target.value); setTimeLeft(+e.target.value * 60); setTotal(+e.target.value * 60) }} style={{ width: '100%', accentColor: 'var(--accent)' }} /></div>
              <div><div className="label">Break: {customBreak}m</div><input type="range" min="1" max="30" step="1" value={customBreak} onChange={e => setCustomBreak(+e.target.value)} style={{ width: '100%', accentColor: 'var(--mint)' }} /></div>
            </div>
          )}
          <div>
            <div className="label">Focus Subject</div>
            <select className="input select" value={subject} onChange={e => setSubject(e.target.value)}>
              {(profile?.subjects || ['General']).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative' }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              <radialGradient id="timerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="transparent" />
                <stop offset="100%" stopColor={ringColor} stopOpacity="0.06" />
              </radialGradient>
            </defs>
            <circle cx={SIZE/2} cy={SIZE/2} r={R + 20} fill="url(#timerGlow)" />
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={ringColor} strokeWidth="10"
              strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round"
              transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
              style={{ filter: `drop-shadow(0 0 8px ${ringColor})`, transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
            <text x={SIZE/2} y={SIZE/2 - 14} textAnchor="middle" fill="var(--text-primary)" fontSize="52" fontWeight="700" fontFamily="JetBrains Mono">{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</text>
            <text x={SIZE/2} y={SIZE/2 + 18} textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontFamily="Inter">
              {phase === 'idle' ? 'Ready' : phase === 'work' ? `Studying ${subject}` : phase === 'break' ? 'Break time' : 'Done!'}
            </text>
          </svg>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12 }}>
          {phase === 'idle' && (
            <button className="btn btn-primary" style={{ padding: '12px 36px', fontSize: 16 }} onClick={start}>Start</button>
          )}
          {(phase === 'work' || phase === 'break') && (
            <>
              <button className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={pause}>Pause</button>
              <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={resume}>Resume</button>
              <button className="btn btn-secondary" style={{ padding: '10px 16px' }} onClick={reset}>Reset</button>
            </>
          )}
          {phase === 'done' && (
            <>
              <button className="btn btn-primary" onClick={() => { reset(); start() }}>New Session</button>
              <button className="btn btn-secondary" onClick={reset}>Reset</button>
            </>
          )}
        </div>

        {/* Break tip */}
        {phase === 'break' && tip && (
          <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 8 }}> Study Tip</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{tip}</p>
          </div>
        )}

        {/* Today's log */}
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Today's Focus Log</span>
            <span style={{ fontSize: 12, color: 'var(--amber)' }}>{todayMins}m total</span>
          </div>
          {todaySessions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No sessions today yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {todaySessions.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.subject}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.duration}m · {new Date(s.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
