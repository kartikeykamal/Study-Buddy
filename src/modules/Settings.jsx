import React, { useState } from 'react'
import { Save, Settings as SettingsIcon } from 'lucide-react'
import { storage, showToast } from '../utils/index.js'

const COLORS = ['#7c6fff','#f0a500','#4ecdc4','#ff6b9d','#a78bfa','#34d399','#fb923c','#60a5fa','#f472b6','#a3e635','#e879f9','#fbbf24']

export default function Settings({ profile, onProfileUpdate }) {
  const [name, setName] = useState(profile?.name || '')
  const [examType, setExamType] = useState(profile?.examType || '')
  const [examDate, setExamDate] = useState(profile?.examDate || '')
  const [subjects, setSubjects] = useState(profile?.subjects || [])
  const [subInput, setSubInput] = useState('')
  const [subColors, setSubColors] = useState(storage.get('subjectColors', {}))
  const [confirmClear, setConfirmClear] = useState('')
  const [studyHours, setStudyHours] = useState(storage.get('preferences', {}).dailyHours || 6)

  const save = () => {
    const updated = { name, examType, examDate, subjects }
    storage.set('profile', updated)
    storage.set('subjectColors', subColors)
    storage.set('preferences', { dailyHours: studyHours })
    onProfileUpdate(updated)
    showToast('Settings saved!', 'success')
  }

  const addSubject = () => {
    const v = subInput.trim()
    if (v && !subjects.includes(v) && subjects.length < 10) { setSubjects(p => [...p, v]); setSubInput('') }
  }

  const clearAll = () => {
    if (confirmClear !== 'DELETE') { showToast('Type DELETE to confirm', 'warning'); return }
    storage.clearAll(); window.location.reload()
  }

  const exportData = () => {
    const data = {}
    Object.keys(localStorage).filter(k => k.startsWith('sb_v1_')).forEach(k => { data[k] = localStorage.getItem(k) })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'studybuddy-backup.json'; a.click()
    showToast('Data exported!', 'success')
  }

  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v))
        showToast('Data imported! Refreshing…', 'success')
        setTimeout(() => window.location.reload(), 1000)
      } catch { showToast('Invalid backup file', 'error') }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <h1 className="section-title"> Profile & Settings</h1>

      {/* Profile */}
      <div className="card mb-4">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}> Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>{(name[0] || 'S').toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div className="label">Your Name</div>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <div className="label">Exam Type</div>
            <select className="input select" value={examType} onChange={e => setExamType(e.target.value)}>
              <option>JEE</option><option>Board</option><option>University Semester</option><option>Custom</option>
            </select>
          </div>
          <div>
            <div className="label">Exam Date</div>
            <input className="input" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="card mb-4">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}> Subjects</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {subjects.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border-bright)', borderRadius: 20, padding: '4px 10px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: subColors[s] || COLORS[i % COLORS.length], cursor: 'pointer' }}
                onClick={() => {
                  const colors = COLORS
                  const ci = colors.indexOf(subColors[s] || COLORS[i % COLORS.length])
                  setSubColors(p => ({ ...p, [s]: colors[(ci + 1) % colors.length] }))
                }} />
              <span style={{ fontSize: 12 }}>{s}</span>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} onClick={() => setSubjects(p => p.filter(x => x !== s))}>×</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} placeholder="Add subject (Enter)" style={{ flex: 1 }} disabled={subjects.length >= 10} />
          <button className="btn btn-secondary btn-sm" onClick={addSubject}>Add</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>Click color dot to cycle through colors</div>
      </div>

      {/* Preferences */}
      <div className="card mb-4">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}> Study Preferences</div>
        <div className="label">Daily Study Goal: {studyHours}h</div>
        <input type="range" min="1" max="12" value={studyHours} onChange={e => setStudyHours(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: 16 }} />
      </div>

      <button className="btn btn-primary" onClick={save} style={{ width: '100%', justifyContent: 'center', marginBottom: 16, padding: '12px' }}> Save Changes</button>

      {/* Data */}
      <div className="card mb-4">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}> Data Management</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button className="btn btn-secondary" onClick={exportData}>Export Data</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
             Import Data
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
          </label>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 8, fontWeight: 600 }}>! Danger Zone</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={confirmClear} onChange={e => setConfirmClear(e.target.value)} placeholder='Type "DELETE" to confirm' style={{ flex: 1, fontSize: 12, borderColor: confirmClear === 'DELETE' ? 'var(--rose)' : 'var(--border)' }} />
            <button className="btn" onClick={clearAll} style={{ background: 'rgba(255,107,157,0.15)', color: 'var(--rose)', border: '1px solid rgba(255,107,157,0.3)', fontSize: 12 }}> Clear All</button>
          </div>
        </div>
      </div>
    </div>
  )
}
