import React from 'react'
import {
  CalendarDays, BookOpen, Network, NotebookPen, Layers,
  FlaskConical, ScrollText, Zap,
  BarChart2, Flame, Timer,
  MessageSquare, Settings
} from 'lucide-react'

const NAV = [
  { section: 'Learn', items: [
    { id: 'studyplan',  Icon: CalendarDays,  label: 'Study Plan' },
    { id: 'syllabus',   Icon: BookOpen,      label: 'Syllabus AI' },
    { id: 'mindmap',    Icon: Network,       label: 'Mind Map' },
    { id: 'notes',      Icon: NotebookPen,   label: 'Notes Studio' },
    { id: 'flashcards', Icon: Layers,        label: 'Flashcards' },
  ]},
  { section: 'Practice', items: [
    { id: 'mocktest', Icon: FlaskConical, label: 'Mock Test' },
    { id: 'pyq',      Icon: ScrollText,   label: 'PYQ Analyzer' },
    { id: 'quiz',     Icon: Zap,          label: 'Quiz Blitz' },
  ]},
  { section: 'Track', items: [
    { id: 'progress', Icon: BarChart2, label: 'Progress' },
    { id: 'streak',   Icon: Flame,     label: 'Streak & XP' },
    { id: 'focus',    Icon: Timer,     label: 'Focus Timer' },
  ]},
  { section: 'Connect', items: [
    { id: 'chat', Icon: MessageSquare, label: 'AI Tutor' },
  ]},
  { section: 'Account', items: [
    { id: 'settings', Icon: Settings, label: 'Settings' },
  ]},
]

export default function Sidebar({ activeModule, onNavigate }) {
  return (
    <div className="sidebar">
      {NAV.map(({ section, items }) => (
        <div className="nav-section" key={section}>
          <div className="nav-section-label">{section}</div>
          {items.map(({ id, Icon, label }) => (
            <div key={id} className={`nav-item ${activeModule === id ? 'active' : ''}`} onClick={() => onNavigate(id)}>
              <span className="nav-icon"><Icon size={15} strokeWidth={1.7} /></span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
