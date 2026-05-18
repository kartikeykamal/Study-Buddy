import React, { useState, useEffect } from 'react'
import { Flame, Star, Trophy } from 'lucide-react'
import { storage, getLevel, LEVEL_NAMES, todayStr } from '../utils/index.js'

const ACHIEVEMENTS = [
  { id: 'first_note', icon: 'star', label: 'First Note', desc: 'Created your first note', check: () => storage.get('notes', []).length >= 1 },
  { id: 'streak_7', icon: 'star', label: '7-Day Streak', desc: 'Studied 7 days in a row', check: () => storage.get('streak', {}).streak >= 7 },
  { id: 'test_master', icon: 'star', label: 'Test Master', desc: 'Scored 90%+ on a mock test', check: () => storage.get('mocktests', []).some(t => t.score >= 90) },
  { id: 'flash_champ', icon: 'star', label: 'Flash Champion', desc: 'Reviewed 100+ flashcards', check: () => storage.get('flashcards', []).flatMap(d => d.cards).length >= 100 },
  { id: 'night_owl', icon: 'star', label: 'Night Owl', desc: 'Studied after 11 PM', check: () => storage.get('focussessions', []).some(s => new Date(s.time).getHours() >= 23) },
  { id: 'early_bird', icon: 'star', label: 'Early Bird', desc: 'Studied before 7 AM', check: () => storage.get('focussessions', []).some(s => new Date(s.time).getHours() < 7) },
  { id: 'note_master', icon: 'star', label: 'Note Master', desc: 'Created 10 notes', check: () => storage.get('notes', []).length >= 10 },
  { id: 'deck_builder', icon: 'star', label: 'Deck Builder', desc: 'Created 3 flashcard decks', check: () => storage.get('flashcards', []).length >= 3 },
  { id: 'pyq_pro', icon: 'star', label: 'PYQ Pro', desc: 'Analyzed previous year questions', check: () => !!storage.get('pyq') },
  { id: 'focus_guru', icon: 'star', label: 'Focus Guru', desc: '10 pomodoro sessions completed', check: () => storage.get('focussessions', []).length >= 10 },
]

export default function StreakXP({ profile }) {
  const [streak, setStreak] = useState(storage.get('streak', { xp: 0, level: 1, streak: 0 }))
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    const unlocked = ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check() }))
    setAchievements(unlocked)
  }, [])

  const lvl = getLevel(streak.xp || 0)
  const today = new Date()

  // Last 7 days calendar
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dateStr === todayStr()
    const sessions = storage.get('focussessions', []).filter(s => s.date === dateStr)
    const studied = sessions.length > 0
    return { dateStr, isToday, studied, day: d.toLocaleDateString('en-US', { weekday: 'short' }) }
  })

  return (
    <div>
      <h1 className="section-title">Streak & XP</h1>

      {/* Big streak number */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 96, fontWeight: 800, fontFamily: 'Playfair Display, serif', color: 'var(--amber)', lineHeight: 1, textShadow: '0 0 40px rgba(240,165,0,0.3)' }}>
          {streak.streak || 0}
        </div>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 4 }}>Day Streak </div>
      </div>

      {/* Weekly calendar */}
      <div className="card mb-6">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Last 7 Days</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {week.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.day}</div>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                background: d.isToday ? 'rgba(240,165,0,0.2)' : d.studied ? 'rgba(240,165,0,0.15)' : 'var(--panel)',
                border: `2px solid ${d.isToday ? 'var(--amber)' : d.studied ? 'rgba(240,165,0,0.4)' : 'var(--border)'}`,
                boxShadow: d.isToday ? '0 0 12px rgba(240,165,0,0.3)' : 'none' }}>
                {d.isToday ? '' : d.studied ? '' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* XP & Level */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>Level {lvl.level}</div>
            <div style={{ fontSize: 14, color: 'var(--amber)', fontWeight: 500 }}>{lvl.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{streak.xp || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total XP</div>
          </div>
        </div>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Progress to Level {lvl.level + 1}</span>
          <span>{lvl.progress}/100 XP</span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div className="progress-fill" style={{ width: `${lvl.progress}%` }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>All 20 Levels</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {LEVEL_NAMES.map((name, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: i + 1 <= lvl.level ? 'var(--accent-dim)' : 'var(--panel)', color: i + 1 <= lvl.level ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${i + 1 <= lvl.level ? 'rgba(124,111,255,0.3)' : 'var(--border)'}` }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* XP Sources */}
      <div className="card mb-6">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>XP Sources</div>
        {[['Daily login','5 XP'],['Create a note','5 XP'],['Complete a task','10 XP'],['Flashcard session','15 XP'],['Complete mock test','20 XP'],['Daily streak bonus','10 XP/day']].map(([action, xp]) => (
          <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{action}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{xp}</span>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}> Achievements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {achievements.map(a => (
            <div key={a.id} className="card" style={{
              opacity: a.unlocked ? 1 : 0.5,
              border: `1px solid ${a.unlocked ? 'rgba(240,165,0,0.3)' : 'var(--border)'}`,
              background: a.unlocked ? 'rgba(240,165,0,0.05)' : 'var(--panel)',
              boxShadow: a.unlocked ? '0 0 16px rgba(240,165,0,0.1)' : 'none',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: a.unlocked ? 'var(--amber)' : 'var(--text-muted)', marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{a.desc}</div>
              {a.unlocked && <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 6 }}> Unlocked</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
