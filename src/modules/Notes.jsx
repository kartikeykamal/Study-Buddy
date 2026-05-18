import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Save, Search, Bold, Italic, Underline, List, ListOrdered,
  Code, Link, AlignLeft, AlignCenter, FileText, Upload, Sparkles,
  BookOpen, ChevronDown, ChevronRight, X, RefreshCw, Download, Eye, Highlighter, Quote
} from 'lucide-react'
import { storage, callClaude, callClaudeWithPDFs, parseJSON, showToast, addXP, getSubjectColor, syllabusStore } from '../utils/index.js'

// ── Subject/Topic picker for AI panel ─────────────────────────────────────
function TopicPicker({ profile, syllabusData, onSelect, selected }) {
  const [expanded, setExpanded] = useState(null)
  const subjects = profile?.subjects || []
  const syllSubjects = syllabusData?.subjects || []

  const items = subjects.map(sub => {
    const syl = syllSubjects.find(s => s.name === sub)
    return { name: sub, topics: syl?.topics?.map(t => t.name) || [], highPriority: syl?.highPriority || [] }
  })

  return (
    <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--b-default)', borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
      {items.map(item => (
        <div key={item.name}>
          <div
            onClick={() => {
              if (item.topics.length) setExpanded(expanded === item.name ? null : item.name)
              else onSelect(item.name, '')
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', cursor: 'pointer', background: selected?.subject === item.name && !selected?.topic ? 'var(--blue-bg)' : 'transparent', borderBottom: '1px solid var(--b-subtle)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: getSubjectColor(item.name, subjects), flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-primary)', flex: 1 }}>{item.name}</span>
            {item.topics.length > 0 && (expanded === item.name ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
          </div>
          {expanded === item.name && item.topics.map(topic => (
            <div key={topic}
              onClick={() => onSelect(item.name, topic)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 22px', cursor: 'pointer', background: selected?.topic === topic ? 'var(--blue-bg)' : 'transparent', borderBottom: '1px solid var(--b-subtle)' }}>
              <span style={{ fontSize: 11, color: 'var(--t-secondary)' }}>{topic}</span>
              {item.highPriority.includes(topic) && <span style={{ fontSize: 9, color: 'var(--rose)', marginLeft: 'auto' }}>🔥</span>}
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 && <p style={{ fontSize: 11, color: 'var(--t-muted)', textAlign: 'center', padding: 12 }}>No subjects in profile</p>}
    </div>
  )
}

// ── Toolbar button ─────────────────────────────────────────────────────────
function TB({ icon: Icon, label, cmd, arg, onCmd, active }) {
  return (
    <button
      title={label}
      onMouseDown={e => { e.preventDefault(); onCmd(cmd, arg) }}
      style={{
        width: 28, height: 26, borderRadius: 5, border: `1px solid ${active ? 'var(--blue-border)' : 'var(--b-default)'}`,
        background: active ? 'var(--blue-bg)' : 'transparent',
        color: active ? 'var(--blue)' : 'var(--t-secondary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
      <Icon size={13} strokeWidth={1.8} />
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Notes({ profile, onNavigate }) {
  const [notes, setNotes] = useState([])
  const [active, setActive] = useState(null)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('All')
  const [aiPanel, setAiPanel] = useState(false)
  const [aiTab, setAiTab] = useState('actions') // 'actions' | 'generate' | 'pdf'
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [pdfFiles, setPdfFiles] = useState([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [aiGenSubject, setAiGenSubject] = useState({ subject: '', topic: '' })
  const [aiGenInstruction, setAiGenInstruction] = useState('')
  const [genStyle, setGenStyle] = useState('structured') // 'structured' | 'concise' | 'detailed'
  const editorRef = useRef(null)
  const saveTimer = useRef(null)
  const pdfRef = useRef(null)
  const syllabusData = syllabusStore.get()

  useEffect(() => {
    const saved = storage.get('notes', [])
    setNotes(saved)
    if (saved.length) setActive(saved[0])
  }, [])

  // ── Auto-save ────────────────────────────────────────────────────────────
  const saveNote = useCallback((note) => {
    if (!note) return
    const content = editorRef.current?.innerHTML || note.content || ''
    const wordCount = (editorRef.current?.innerText || '').trim().split(/\s+/).filter(Boolean).length
    const updated = notes.map(n => n.id === note.id ? { ...note, content, wordCount } : n)
    setNotes(updated); storage.set('notes', updated)
    setSaveStatus('Saved'); setTimeout(() => setSaveStatus(''), 2000)
  }, [notes])

  const createNote = (opts = {}) => {
    const note = {
      id: Date.now(), title: opts.title || 'Untitled Note',
      content: opts.content || '',
      subject: opts.subject || profile?.subjects?.[0] || '',
      created: new Date().toISOString(), wordCount: 0,
      type: opts.type || 'text'
    }
    const updated = [note, ...notes]; setNotes(updated); storage.set('notes', updated)
    setActive(note); addXP('note')
    setTimeout(() => {
      if (editorRef.current) { editorRef.current.innerHTML = note.content || ''; editorRef.current.focus() }
    }, 50)
  }

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated); storage.set('notes', updated)
    const next = updated[0] || null; setActive(next)
    setTimeout(() => { if (next && editorRef.current) editorRef.current.innerHTML = next.content || '' }, 30)
  }

  const selectNote = (note) => {
    if (active) saveNote(active)
    setActive(note)
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = note.content || '' }, 20)
  }

  const updateMeta = (field, value) => {
    if (!active) return
    const updated = { ...active, [field]: value }
    setActive(updated)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNote(updated), 1500)
  }

  const triggerSave = () => {
    clearTimeout(saveTimer.current)
    if (!active) return
    saveNote(active)
  }

  // ── Toolbar commands ─────────────────────────────────────────────────────
  const execCmd = (cmd, arg = null) => {
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:')
      if (url) document.execCommand('createLink', false, url)
    } else if (cmd === 'highlight') {
      document.execCommand('hiliteColor', false, '#fef08a')
    } else {
      document.execCommand(cmd, false, arg)
    }
    editorRef.current?.focus()
  }

  // ── PDF import & AI extraction ───────────────────────────────────────────
  const importPDF = async () => {
    if (pdfFiles.length === 0) { showToast('Select a PDF first', 'warning'); return }
    setPdfLoading(true)
    const prompt = `Extract and structure the content from this PDF into well-formatted study notes.
Format as HTML with: <h2> for sections, <h3> for subsections, <ul>/<li> for lists, <p> for paragraphs, <strong> for key terms.
Preserve all important information, formulas, definitions, and key points.
Make it student-friendly and well-organized.`
    const result = await callClaudeWithPDFs(pdfFiles, prompt, '', 6000)
    if (result) {
      const title = pdfFiles[0].name.replace('.pdf', '')
      createNote({ title, content: result, subject: active?.subject || profile?.subjects?.[0] || '', type: 'pdf' })
      setPdfFiles([])
      showToast('PDF imported and formatted!', 'success')
    } else {
      showToast('PDF extraction failed', 'error')
    }
    setPdfLoading(false)
  }

  // ── AI generate notes ────────────────────────────────────────────────────
  const generateNotes = async () => {
    const { subject, topic } = aiGenSubject
    if (!subject && !topic && !aiGenInstruction) { showToast('Select a subject/topic or add instructions', 'warning'); return }
    setAiLoading(true); setAiResult(null)

    const syllCtx = (() => {
      const syl = syllabusData?.subjects?.find(s => s.name === subject)
      if (!syl) return ''
      const topicData = syl.topics?.find(t => t.name === topic)
      if (topicData) return `Syllabus context: subtopics: ${topicData.subtopics?.join(', ')}. Key formulas: ${topicData.keyFormulas?.join(', ')}.`
      return `Syllabus context for ${subject}: high priority: ${syl.highPriority?.join(', ')}.`
    })()

    const styleMap = {
      structured: 'Structured with clear sections, bullet points, and examples.',
      concise: 'Concise revision notes — only the most important points, formulas, and definitions.',
      detailed: 'Detailed and comprehensive — explain concepts fully with examples and analogies.'
    }

    const prompt = `You are an expert academic note-maker for ${profile?.examType || 'competitive exam'} students.
Generate ${styleMap[genStyle]}
Subject: ${subject || 'General'}${topic ? ` → Topic: ${topic}` : ''}
${syllCtx}
${aiGenInstruction ? `Additional focus: ${aiGenInstruction}` : ''}

Return well-structured HTML notes using:
- <h2> for main sections
- <h3> for subsections  
- <ul><li> for bullet lists
- <strong> for key terms and formulas
- <em> for important notes
- <p> for explanations
- Use 🔑 🔥 ⚠️ emojis sparingly for key points

Make it comprehensive, exam-focused, and well-organised.`

    const result = await callClaude(prompt, '', 4000)
    if (result) {
      const title = topic || subject || 'AI Notes'
      createNote({ title, content: result, subject, type: 'ai' })
      setAiResult('created')
      showToast('Notes generated!', 'success')
      addXP('note')
    } else {
      showToast('Generation failed', 'error')
    }
    setAiLoading(false)
  }

  // ── AI actions on current note ───────────────────────────────────────────
  const aiAction = async (action) => {
    const content = editorRef.current?.innerText || active?.content || ''
    if (!content.trim()) { showToast('Write some notes first', 'warning'); return }
    setAiLoading(true); setAiResult(null)

    const prompts = {
      summarize: `Summarize these study notes into exactly 5 bullet points (start each with •). Be concise:\n"${content.slice(0, 3000)}"`,
      flashcards: `Generate 10 flashcard Q&A pairs from these notes. Return ONLY JSON: [{"question":"...","answer":"..."}]\n"${content.slice(0, 3000)}"`,
      simplify: `Rewrite these notes in simpler language (ELI15 style) keeping all key facts:\n"${content.slice(0, 3000)}"`,
      gaps: `Read these notes and list 5 important topics that seem missing. Return as bullet points (start each with •):\n"${content.slice(0, 3000)}"`,
      enhance: `Enhance these notes: add more detail, examples, and clarify unclear parts. Return as HTML with <h3>, <ul><li>, <p>, <strong>:\n"${content.slice(0, 3000)}"`,
      quiz: `Generate 5 exam-style questions from these notes. Return ONLY JSON: [{"question":"...","answer":"...","type":"short"}]\n"${content.slice(0, 3000)}"`,
    }

    const text = await callClaude(prompts[action], '', 2500)
    if (text) {
      if (action === 'flashcards' || action === 'quiz') {
        const cards = parseJSON(text, [])
        if (action === 'flashcards' && cards.length) {
          const decks = storage.get('flashcards', [])
          const deck = { id: Date.now(), name: active.title, subject: active.subject, cards: cards.map((c, i) => ({ id: i, front: c.question, back: c.answer, mastery: 0 })), created: new Date().toISOString() }
          decks.unshift(deck); storage.set('flashcards', decks)
          showToast('Flashcard deck created!', 'success')
        }
        setAiResult({ type: action, data: cards })
      } else if (action === 'enhance') {
        if (editorRef.current) editorRef.current.innerHTML = text
        triggerSave()
        setAiResult({ type: 'text', text: '✅ Notes enhanced!' })
      } else {
        setAiResult({ type: 'text', text })
      }
    }
    setAiLoading(false)
  }

  const exportNote = () => {
    if (!active) return
    const content = editorRef.current?.innerText || active.content || ''
    const blob = new Blob([`# ${active.title}\n\n${content}`], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${active.title}.txt`; a.click()
  }

  const filtered = notes.filter(n => {
    const text = (n.title + n.content).toLowerCase()
    return (!search || text.includes(search.toLowerCase())) && (filterSubject === 'All' || n.subject === filterSubject)
  })

  const wordCount = (editorRef.current?.innerText || active?.content || '').trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height) - var(--dock-height) - 40px)', gap: 12 }}>
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--t-ghost); pointer-events: none; }
        .note-editor h2 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; color: var(--t-primary); }
        .note-editor h3 { font-size: 15px; font-weight: 600; margin: 10px 0 4px; color: var(--t-primary); }
        .note-editor p { margin: 0 0 8px; line-height: 1.75; }
        .note-editor ul, .note-editor ol { padding-left: 20px; margin: 6px 0; }
        .note-editor li { margin-bottom: 3px; line-height: 1.65; }
        .note-editor strong { color: var(--t-primary); }
        .note-editor code { background: var(--bg-subtle); padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: JetBrains Mono, monospace; color: var(--accent); }
        .note-editor blockquote { border-left: 3px solid var(--accent); padding-left: 12px; color: var(--t-secondary); margin: 8px 0; font-style: italic; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Notes list ── */}
      <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <button onClick={() => createNote()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={13} /> New Note
        </button>

        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ width: '100%', padding: '6px 8px 6px 26px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 11.5, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['All', ...(profile?.subjects || [])].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, border: `1px solid ${filterSubject === s ? 'var(--blue-border)' : 'var(--b-default)'}`, cursor: 'pointer', background: filterSubject === s ? 'var(--blue-bg)' : 'transparent', color: filterSubject === s ? 'var(--blue)' : 'var(--t-muted)' }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => selectNote(n)}
              style={{ padding: '9px 11px', borderRadius: 9, border: `1px solid ${active?.id === n.id ? 'var(--blue-border)' : 'var(--b-default)'}`, background: active?.id === n.id ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: getSubjectColor(n.subject, profile?.subjects), flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.title}</span>
                {n.type === 'ai' && <Sparkles size={9} color="var(--accent)" />}
                {n.type === 'pdf' && <FileText size={9} color="var(--amber)" />}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.subject} · {n.wordCount || 0}w
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ fontSize: 11, color: 'var(--t-muted)', textAlign: 'center', padding: '16px 0' }}>No notes</p>}
        </div>
      </div>

      {/* ── Editor ── */}
      {active ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input value={active.title} onChange={e => updateMeta('title', e.target.value)}
              style={{ flex: 1, fontSize: 17, fontWeight: 700, background: 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '3px 6px', color: 'var(--t-primary)', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.border = '1px solid var(--b-default)'}
              onBlur={e => e.target.style.border = '1px solid transparent'} />
            <select value={active.subject} onChange={e => updateMeta('subject', e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 11.5 }}>
              {(profile?.subjects || []).map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => { setAiPanel(p => !p); setAiTab('actions') }}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${aiPanel ? 'var(--blue-border)' : 'var(--b-default)'}`, background: aiPanel ? 'var(--blue-bg)' : 'var(--bg-card)', color: aiPanel ? 'var(--blue)' : 'var(--t-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={12} /> AI
            </button>
            <button onClick={exportNote} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={13} />
            </button>
            <button onClick={() => deleteNote(active.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--rose)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={13} />
            </button>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 3, padding: '5px 8px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--b-default)', flexWrap: 'wrap', alignItems: 'center' }}>
            <TB icon={Bold} label="Bold" cmd="bold" onCmd={execCmd} />
            <TB icon={Italic} label="Italic" cmd="italic" onCmd={execCmd} />
            <TB icon={Underline} label="Underline" cmd="underline" onCmd={execCmd} />
            <TB icon={Highlighter} label="Highlight" cmd="highlight" onCmd={execCmd} />
            <div style={{ width: 1, height: 18, background: 'var(--b-default)', margin: '0 2px' }} />
            <TB icon={List} label="Bullet List" cmd="insertUnorderedList" onCmd={execCmd} />
            <TB icon={ListOrdered} label="Numbered List" cmd="insertOrderedList" onCmd={execCmd} />
            <TB icon={Quote} label="Blockquote" cmd="formatBlock" arg="blockquote" onCmd={execCmd} />
            <div style={{ width: 1, height: 18, background: 'var(--b-default)', margin: '0 2px' }} />
            {[['H1', 'h2'], ['H2', 'h3']].map(([label, tag]) => (
              <button key={tag} onMouseDown={e => { e.preventDefault(); execCmd('formatBlock', tag) }}
                style={{ padding: '0 7px', height: 26, borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                {label}
              </button>
            ))}
            <TB icon={Code} label="Inline Code" cmd="formatBlock" arg="code" onCmd={execCmd} />
            <TB icon={Link} label="Insert Link" cmd="createLink" onCmd={execCmd} />
            <div style={{ width: 1, height: 18, background: 'var(--b-default)', margin: '0 2px' }} />
            <TB icon={AlignLeft} label="Align Left" cmd="justifyLeft" onCmd={execCmd} />
            <TB icon={AlignCenter} label="Align Center" cmd="justifyCenter" onCmd={execCmd} />
            <div style={{ flex: 1 }} />
            <button onMouseDown={e => { e.preventDefault(); execCmd('selectAll'); execCmd('removeFormat') }}
              style={{ padding: '0 7px', height: 26, borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-muted)', cursor: 'pointer', fontSize: 10 }}>
              Clear
            </button>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="note-editor"
            data-placeholder="Start writing… or use AI to generate notes"
            onInput={triggerSave}
            style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '16px 20px', color: 'var(--t-primary)', lineHeight: 1.8, fontSize: 14, overflowY: 'auto', outline: 'none' }}
          />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--t-muted)' }}>
            <span>{wordCount} words · ~{readTime} min read</span>
            <span style={{ color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {saveStatus && <><Save size={10} /> {saveStatus}</>}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 40, opacity: 0.4 }}>📝</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t-primary)' }}>Notes Studio</div>
          <p style={{ fontSize: 13, color: 'var(--t-muted)', textAlign: 'center' }}>Create a new note, import a PDF, or let AI generate one</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => createNote()} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ New Note</button>
            <button onClick={() => { setAiPanel(true); setAiTab('generate') }} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', fontSize: 12.5, cursor: 'pointer' }}>✦ AI Generate</button>
          </div>
        </div>
      )}

      {/* ── AI Panel ── */}
      {aiPanel && (
        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

          {/* AI panel tabs */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', padding: 3, borderRadius: 8 }}>
            {[['actions', '⚡ Actions'], ['generate', '✦ Generate'], ['pdf', '📄 PDF']].map(([t, label]) => (
              <button key={t} onClick={() => setAiTab(t)}
                style={{ flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 10, border: 'none', cursor: 'pointer', fontWeight: aiTab === t ? 600 : 400, background: aiTab === t ? 'var(--bg-card)' : 'transparent', color: aiTab === t ? 'var(--t-primary)' : 'var(--t-muted)', boxShadow: aiTab === t ? 'var(--sh-xs)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Actions tab ── */}
          {aiTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, color: 'var(--t-muted)', marginBottom: 2 }}>Run AI on the current note</div>
              {[
                ['summarize', '📋 Summarize', 'Get 5 key bullet points'],
                ['flashcards', '🃏 Flashcards', 'Generate a flashcard deck'],
                ['quiz', '🎯 Quiz Me', 'Create 5 exam questions'],
                ['simplify', '🧠 Simplify', 'Rewrite in simple terms'],
                ['enhance', '✨ Enhance', 'Add detail & examples'],
                ['gaps', '🔍 Find Gaps', 'What topics are missing?'],
              ].map(([act, label, desc]) => (
                <button key={act} onClick={() => aiAction(act)} disabled={aiLoading || !active}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', cursor: 'pointer', textAlign: 'left', opacity: !active ? 0.5 : 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>{desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Generate tab ── */}
          {aiTab === 'generate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Pick a subject and topic — AI will write full notes</div>
              <TopicPicker
                profile={profile} syllabusData={syllabusData}
                selected={aiGenSubject}
                onSelect={(subject, topic) => setAiGenSubject({ subject, topic })}
              />
              {aiGenSubject.subject && (
                <div style={{ fontSize: 11.5, color: 'var(--accent)', padding: '4px 8px', background: 'var(--blue-bg)', borderRadius: 6 }}>
                  {aiGenSubject.subject}{aiGenSubject.topic ? ` → ${aiGenSubject.topic}` : ''}
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Style</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[['structured', '📑 Structured'], ['concise', '⚡ Concise'], ['detailed', '📖 Detailed']].map(([s, label]) => (
                    <button key={s} onClick={() => setGenStyle(s)}
                      style={{ flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 6, border: `1px solid ${genStyle === s ? 'var(--blue-border)' : 'var(--b-default)'}`, background: genStyle === s ? 'var(--blue-bg)' : 'transparent', color: genStyle === s ? 'var(--blue)' : 'var(--t-muted)', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={aiGenInstruction} onChange={e => setAiGenInstruction(e.target.value)}
                placeholder="Extra instructions (optional): focus on formulas, include examples, cover unit 3…"
                style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 11.5, resize: 'none', height: 70, outline: 'none', lineHeight: 1.5 }} />
              <button onClick={generateNotes} disabled={aiLoading}
                style={{ padding: '9px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: aiLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {aiLoading ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : '✦ Generate Notes'}
              </button>
            </div>
          )}

          {/* ── PDF tab ── */}
          {aiTab === 'pdf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Import a PDF — AI will extract and format it as notes</div>

              <div
                onClick={() => pdfRef.current?.click()}
                style={{ border: '2px dashed var(--b-default)', borderRadius: 9, padding: '24px 12px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-subtle)' }}>
                <Upload size={22} color="var(--t-muted)" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-secondary)', marginBottom: 3 }}>Drop PDF here</div>
                <div style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>or click to browse</div>
                <input ref={pdfRef} type="file" accept=".pdf" multiple
                  onChange={e => setPdfFiles(Array.from(e.target.files))}
                  style={{ display: 'none' }} />
              </div>

              {pdfFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {pdfFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', background: 'var(--bg-card)', borderRadius: 7, border: '1px solid var(--b-default)' }}>
                      <FileText size={13} color="var(--amber)" />
                      <span style={{ fontSize: 11.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--t-secondary)' }}>{f.name}</span>
                      <button onClick={() => setPdfFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={importPDF} disabled={pdfLoading || pdfFiles.length === 0}
                style={{ padding: '9px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: pdfLoading || pdfFiles.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {pdfLoading ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Extracting…</> : '📄 Import & Format PDF'}
              </button>

              <div style={{ fontSize: 10.5, color: 'var(--t-muted)', lineHeight: 1.5 }}>
                AI will read the PDF and create structured, editable notes you can annotate and study from.
              </div>
            </div>
          )}

          {/* AI Result */}
          {(aiLoading || aiResult) && aiTab === 'actions' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 9, padding: '11px 12px', overflowY: 'auto', maxHeight: 280 }}>
              {aiLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--t-muted)', fontSize: 12 }}>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> AI thinking…
                </div>
              )}
              {aiResult && !aiLoading && (
                aiResult.type === 'text' ? (
                  <div style={{ fontSize: 12, color: 'var(--t-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{aiResult.text}</div>
                ) : aiResult.type === 'flashcards' || aiResult.type === 'quiz' ? (
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mint)', marginBottom: 8 }}>
                      {aiResult.type === 'flashcards' ? `🃏 ${aiResult.data?.length} flashcards created!` : `🎯 ${aiResult.data?.length} questions`}
                    </div>
                    {aiResult.data?.slice(0, 4).map((c, i) => (
                      <div key={i} style={{ marginBottom: 8, fontSize: 11, padding: '6px 8px', background: 'var(--bg-subtle)', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, color: 'var(--t-primary)', marginBottom: 2 }}>Q: {c.question}</div>
                        <div style={{ color: 'var(--t-secondary)' }}>A: {c.answer}</div>
                      </div>
                    ))}
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
