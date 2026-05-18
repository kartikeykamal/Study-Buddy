import React, { useState, useEffect } from 'react'
import { CalendarDays, MessageSquare, BookOpen, FlaskConical, ScrollText, Layers, Flame, TrendingUp, Pencil } from 'lucide-react'
import { callClaude, storage, timeGreeting, daysUntil, todayStr, syllabusStore } from '../utils/index.js'

const TILES = (syllabus, pyq) => [
  { id: 'studyplan',  Icon: CalendarDays,  label: 'Study Plan',   sub: "Today's schedule",  color: '#c4732a' },
  { id: 'chat',       Icon: MessageSquare, label: 'AI Tutor',     sub: 'Ask anything',       color: '#5a7a55' },
  { id: 'syllabus',   Icon: BookOpen,      label: 'Syllabus',     sub: syllabus ? `${syllabus.totalTopics} topics` : 'Upload & analyse', color: '#4a6080' },
  { id: 'mocktest',   Icon: FlaskConical,  label: 'Mock Test',    sub: 'Practice exam',      color: '#c4732a' },
  { id: 'pyq',        Icon: ScrollText,    label: 'PYQ Analyser', sub: pyq ? 'View insights' : 'Analyse papers', color: '#8a5a5a' },
  { id: 'flashcards', Icon: Layers,        label: 'Flashcards',   sub: 'Practice & review',  color: '#5a7a55' },
]

export default function Home({ profile, onNavigate }) {
  const [quote, setQuote] = useState(null)
  const [hovered, setHovered] = useState(null)
  const syllabusData = syllabusStore.get()
  const pyqData = storage.get('pyq', null)
  const streak = storage.get('streak', {})
  const days = profile?.examDate ? daysUntil(profile.examDate) : null

  useEffect(() => {
    const today = todayStr()
    const cached = storage.get('daily_quote')
    if (cached?.date === today) { setQuote(cached.q); return }
    callClaude(
      `Give one short, warm and encouraging quote (under 18 words) for a student studying for ${profile?.examType || 'an exam'}. Just the quote, no attribution, no quote marks.`
    ).then(q => {
      if (q) { storage.set('daily_quote', { q, date: today }); setQuote(q.trim()) }
    })
  }, [])

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', paddingBottom: 32 }}>

      {/* ── Hero card ── */}
      <div style={{
        background: '#fefcf8',
        border: '1px solid rgba(140,120,90,0.18)',
        borderRadius: 18,
        padding: '26px 28px',
        marginBottom: 14,
        boxShadow: '0 3px 14px rgba(60,40,10,0.09), 0 1px 3px rgba(60,40,10,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20,
        position: 'relative', overflow: 'hidden',
        /* ruled lines on the hero card itself */
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(160,140,110,0.13) 31px, rgba(160,140,110,0.13) 32px)',
      }}>
        {/* Left margin line inside card */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 48, width: 1, background: 'rgba(210,140,120,0.18)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(180,160,130,0.8)', marginBottom: 10, letterSpacing: '0.04em' }}>
            {dateStr}
          </div>
          <h1 style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700, fontSize: 30, lineHeight: 1.15,
            color: '#2c2416', marginBottom: 14,
          }}>
            {timeGreeting()}, {profile?.name || 'Scholar'} ✦
          </h1>
          {quote
            ? (
              <p style={{
                fontSize: 13.5, color: '#5a4e3a', fontStyle: 'italic',
                fontFamily: "'Lora', serif",
                lineHeight: 1.75, maxWidth: 340,
                borderLeft: '3px solid rgba(196,115,42,0.35)',
                paddingLeft: 12,
              }}>
                "{quote}"
              </p>
            )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[240, 180].map((w, i) => (
                  <div key={i} style={{ height: 10, width: w, background: 'rgba(160,140,110,0.14)', borderRadius: 4 }} />
                ))}
              </div>
            )
          }
        </div>

        {days !== null && (
          <div style={{
            background: 'rgba(196,115,42,0.07)',
            border: '1px solid rgba(196,115,42,0.2)',
            borderRadius: 14, padding: '16px 20px', textAlign: 'center', flexShrink: 0,
            minWidth: 90,
          }}>
            <div style={{
              fontFamily: "'Caveat', cursive", fontWeight: 600,
              fontSize: 42, lineHeight: 1,
              color: days < 15 ? '#b85a5a' : '#c4732a',
            }}>{days}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(160,140,110,0.8)', marginTop: 5, fontFamily: "'Inter', sans-serif" }}>days left</div>
            <div style={{ fontSize: 12, color: '#8a7a62', marginTop: 5, fontFamily: "'Caveat', cursive" }}>{profile?.examType}</div>
          </div>
        )}
      </div>

      {/* ── Status pills ── */}
      {(streak?.streak > 0 || syllabusData || pyqData) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {streak?.streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(196,115,42,0.09)', border: '1px solid rgba(196,115,42,0.20)', borderRadius: 8, fontSize: 12.5, color: '#5a4e3a' }}>
              <Flame size={13} color="#c4732a" strokeWidth={2} />
              <span style={{ fontFamily: "'Inter', sans-serif" }}><strong style={{ color: '#c4732a' }}>{streak.streak}</strong> day streak</span>
            </div>
          )}
          {syllabusData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(90,122,85,0.09)', border: '1px solid rgba(90,122,85,0.20)', borderRadius: 8, fontSize: 12.5, color: '#5a4e3a' }}>
              <BookOpen size={13} color="#5a7a55" strokeWidth={2} />
              <span style={{ fontFamily: "'Inter', sans-serif" }}><strong style={{ color: '#5a7a55' }}>{syllabusData.totalTopics}</strong> topics loaded</span>
            </div>
          )}
          {pyqData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(74,96,128,0.09)', border: '1px solid rgba(74,96,128,0.20)', borderRadius: 8, fontSize: 12.5, color: '#5a4e3a' }}>
              <TrendingUp size={13} color="#4a6080" strokeWidth={2} />
              <span style={{ fontFamily: "'Inter', sans-serif" }}><strong style={{ color: '#4a6080' }}>{pyqData.totalQuestions || pyqData.questions?.length || '?'}</strong> PYQs analysed</span>
            </div>
          )}
        </div>
      )}

      {/* ── Section label ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <Pencil size={13} color="rgba(196,115,42,0.6)" strokeWidth={1.8} />
        <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(160,140,110,0.9)', fontWeight: 500 }}>
          open a subject
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(160,140,110,0.15)' }} />
      </div>

      {/* ── Tiles grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {TILES(syllabusData, pyqData).map(({ id, Icon, label, sub, color }) => (
          <div
            key={id}
            onClick={() => onNavigate(id)}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: '#fefcf8',
              border: `1px solid ${hovered === id ? 'rgba(140,120,90,0.30)' : 'rgba(140,120,90,0.16)'}`,
              borderRadius: 14,
              padding: '15px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: hovered === id
                ? '0 6px 20px rgba(60,40,10,0.11), 0 2px 6px rgba(60,40,10,0.07)'
                : '0 2px 6px rgba(60,40,10,0.07)',
              transform: hovered === id ? 'translateY(-3px)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 9,
              /* ruled lines on each tile */
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(160,140,110,0.10) 23px, rgba(160,140,110,0.10) 24px)',
            }}
          >
            <span style={{
              color: hovered === id ? color : 'rgba(160,140,110,0.7)',
              transition: 'color 0.18s',
            }}>
              <Icon size={17} strokeWidth={1.7} />
            </span>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: '#1e1810', marginBottom: 2, letterSpacing: '-0.01em' }}>
                {label}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(160,140,110,0.9)' }}>
                {sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
