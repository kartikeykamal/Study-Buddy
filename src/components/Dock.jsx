import React from 'react'
import { CalendarDays, BookOpen, NotebookPen, Layers, FlaskConical, ScrollText, Zap, MessageSquare } from 'lucide-react'

const ITEMS = [
  { id: 'studyplan',  Icon: CalendarDays,  label: 'Plan' },
  { id: 'syllabus',   Icon: BookOpen,      label: 'Syllabus' },
  { id: 'notes',      Icon: NotebookPen,   label: 'Notes' },
  { id: 'flashcards', Icon: Layers,        label: 'Cards' },
  { id: 'mocktest',   Icon: FlaskConical,  label: 'Test' },
  { id: 'pyq',        Icon: ScrollText,    label: 'PYQ' },
  { id: 'quiz',       Icon: Zap,           label: 'Quiz' },
  { id: 'chat',       Icon: MessageSquare, label: 'Tutor' },
]

export default function Dock({ activeModule, onNavigate }) {
  return (
    <div className="dock">
      {ITEMS.map(({ id, Icon, label }) => (
        <div key={id} className={`dock-item ${activeModule === id ? 'active' : ''}`} onClick={() => onNavigate(id)} title={label}>
          <span className="dock-icon"><Icon size={17} strokeWidth={1.7} /></span>
          <span className="dock-label">{label}</span>
        </div>
      ))}
    </div>
  )
}
