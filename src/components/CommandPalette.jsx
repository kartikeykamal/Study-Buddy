import React, { useState, useEffect, useRef } from 'react'
import { Search, CalendarDays, BookOpen, Network, NotebookPen, Layers, FlaskConical, ScrollText, Zap, BarChart2, Flame, Timer, MessageSquare, Settings, Hash } from 'lucide-react'

const ICON_MAP = {
  studyplan: CalendarDays, syllabus: BookOpen, mindmap: Network,
  notes: NotebookPen, flashcards: Layers, mocktest: FlaskConical,
  pyq: ScrollText, quiz: Zap, progress: BarChart2,
  streak: Flame, focus: Timer, chat: MessageSquare, settings: Settings,
}

const MODULES = [
  { id: 'studyplan',  label: 'Study Plan',         category: 'Module' },
  { id: 'syllabus',   label: 'Syllabus Analyzer',   category: 'Module' },
  { id: 'mindmap',    label: 'Mind Map',             category: 'Module' },
  { id: 'notes',      label: 'Notes Studio',         category: 'Module' },
  { id: 'flashcards', label: 'Flashcards',           category: 'Module' },
  { id: 'mocktest',   label: 'Mock Test',            category: 'Module' },
  { id: 'pyq',        label: 'PYQ Analyzer',         category: 'Module' },
  { id: 'quiz',       label: 'Quiz Blitz',           category: 'Module' },
  { id: 'progress',   label: 'Progress Dashboard',   category: 'Module' },
  { id: 'streak',     label: 'Streak & XP',          category: 'Module' },
  { id: 'focus',      label: 'Focus Timer',          category: 'Module' },
  { id: 'chat',       label: 'AI Tutor',             category: 'Module' },
  { id: 'settings',   label: 'Settings',             category: 'Module' },
]

export default function CommandPalette({ onNavigate, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(MODULES)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') setSelected(p => Math.min(p + 1, results.length - 1))
      if (e.key === 'ArrowUp') setSelected(p => Math.max(p - 1, 0))
      if (e.key === 'Enter' && results[selected]) { onNavigate(results[selected].id); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected])

  useEffect(() => {
    const q = query.toLowerCase()
    setResults(q ? MODULES.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : MODULES)
    setSelected(0)
  }, [query])

  return (
    <div className="command-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={15} strokeWidth={1.8} color="var(--t-muted)" />
          <input ref={inputRef} className="command-input" value={query}
            onChange={e => setQuery(e.target.value)} placeholder="Search modules…" />
          <span style={{ fontSize: 11, color: 'var(--t-ghost)', background: 'var(--bg-subtle)', border: '1px solid var(--b-default)', borderRadius: 4, padding: '2px 6px', fontFamily: 'var(--f-mono)' }}>ESC</span>
        </div>
        <div className="command-results">
          {results.map((m, i) => {
            const Icon = ICON_MAP[m.id] || Hash
            return (
              <div key={m.id} className={`command-result-item ${i === selected ? 'selected' : ''}`}
                onClick={() => { onNavigate(m.id); onClose() }}
                onMouseEnter={() => setSelected(i)}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-subtle)', border: '1px solid var(--b-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} strokeWidth={1.7} color="var(--t-muted)" />
                </div>
                <span style={{ flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--t-ghost)', background: 'var(--bg-subtle)', padding: '1px 7px', borderRadius: 4 }}>{m.category}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
