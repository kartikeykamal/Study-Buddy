import React, { useState, useEffect, useRef } from 'react'
import { Send, Trash2, BookOpen, Layers, Pin, MessageSquare, HelpCircle, Microscope, Loader } from 'lucide-react'
import { callClaude, storage, showToast, daysUntil, addNotification, syllabusStore } from '../utils/index.js'
import { callGeminiChat } from '../utils/gemini.js'

function renderMessage(text) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '')
      return <pre key={i} style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 'var(--r-sm)', margin: '8px 0', fontFamily: 'var(--f-mono)', fontSize: 11.5, overflowX: 'auto', color: 'var(--blue)', whiteSpace: 'pre-wrap', border: '1px solid var(--b-subtle)' }}>{code}</pre>
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return <span key={i}>{boldParts.map((bp, k) => bp.startsWith('**') && bp.endsWith('**') ? <strong key={k}>{bp.slice(2,-2)}</strong> : <span key={k}>{bp}</span>)}</span>
  })
}

export default function AITutor({ profile, onNavigate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [mode, setMode] = useState('chat')
  const bottomRef = useRef(null)
  const days = profile?.examDate ? daysUntil(profile.examDate) : '?'
  const syllabusCtx = syllabusStore.getSummary()

  const systemPrompt = `You are a focused academic tutor for a student preparing for ${profile?.examType || 'an exam'}.
Student: ${profile?.name || 'Student'} | Subjects: ${profile?.subjects?.join(', ') || 'general'} | Exam in: ${days} days
${syllabusCtx ? `Syllabus: ${syllabusCtx}` : ''}
Mode: ${mode === 'quiz' ? 'Quiz mode — ask one question at a time, evaluate answers' : mode === 'explain' ? 'Explanation mode — thorough, structured with examples' : 'Chat mode — concise and encouraging'}
Format: Use **bold** for key terms. Be educational and clear.`

  const QUICK = {
    chat: [`What are key topics for ${profile?.examType || 'my exam'}?`, 'Give me a revision strategy', 'Explain a core concept', 'How do I manage exam stress?'],
    quiz: [`Quiz me on ${profile?.subjects?.[0] || 'my subject'}`, 'Give me a conceptual question', 'Test my formula knowledge', 'Ask an application question'],
    explain: ['Explain a concept with examples', 'Break down a difficult topic', 'Give me an analogy', 'How does this appear in exams?'],
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typingText])

  const typeWriter = (text, onDone) => {
    const words = text.split(' '); let i = 0; setTypingText('')
    const id = setInterval(() => {
      i += 3; setTypingText(words.slice(0, i).join(' '))
      if (i >= words.length) { clearInterval(id); setTypingText(''); onDone(text) }
    }, 25)
  }

  const send = async (msg = input) => {
    const trimmed = (typeof msg === 'string' ? msg : input).trim()
    if (!trimmed || loading) return
    const userMsg = { role: 'user', content: trimmed }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setInput(''); setLoading(true)
    const text = await callGeminiChat(newMsgs.map(m => ({ role: m.role, content: m.content })), systemPrompt, 1200)
      .catch(e => `Sorry, I couldn't respond right now. (${e.message})`)
    setLoading(false)
    typeWriter(text, (full) => setMessages(p => [...p, { role: 'assistant', content: full }]))
  }

  const saveToNotes = (content) => {
    const notes = storage.get('notes', [])
    notes.unshift({ id: Date.now(), title: 'AI Tutor Response', content, subject: profile?.subjects?.[0] || '', created: new Date().toISOString() })
    storage.set('notes', notes); showToast('Saved to Notes!', 'success')
  }

  const makeFlashcard = (question, answer) => {
    const decks = storage.get('flashcards', [])
    let deck = decks.find(d => d.name === 'AI Tutor Cards')
    if (!deck) { deck = { id: Date.now(), name: 'AI Tutor Cards', subject: profile?.subjects?.[0] || '', cards: [], created: new Date().toISOString() }; decks.unshift(deck) }
    deck.cards.push({ id: Date.now(), front: question, back: answer, mastery: 0 })
    storage.set('flashcards', decks); showToast('Flashcard created!', 'success')
  }

  const MODES = [
    { id: 'chat',    Icon: MessageSquare, label: 'Chat' },
    { id: 'quiz',    Icon: HelpCircle,    label: 'Quiz Me' },
    { id: 'explain', Icon: Microscope,    label: 'Explain' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h) - var(--dock-h) - 44px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>AI Tutor</h1>
          <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>
            {profile?.examType} · {days} days left
            {syllabusCtx && <span style={{ color: 'var(--blue)', marginLeft: 8 }}>· Syllabus loaded</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!syllabusCtx && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate?.('syllabus')}>
              <BookOpen size={13} strokeWidth={1.8} /> Load Syllabus
            </button>
          )}
          {messages.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setMessages([]); setTypingText('') }}>
              <Trash2 size={13} strokeWidth={1.8} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexShrink: 0 }}>
        {MODES.map(({ id, Icon, label }) => (
          <button key={id} onClick={() => { setMode(id); setMessages([]); setTypingText('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 'var(--r-sm)', fontSize: 12.5, fontWeight: mode === id ? 600 : 400,
              border: `1px solid ${mode === id ? 'var(--blue-border)' : 'var(--b-default)'}`,
              background: mode === id ? 'var(--blue-bg)' : 'transparent',
              color: mode === id ? 'var(--blue)' : 'var(--t-secondary)',
              cursor: 'pointer', fontFamily: 'var(--f-body)',
            }}>
            <Icon size={13} strokeWidth={1.8} />{label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
        {messages.length === 0 && !typingText && (
          <div style={{ paddingBottom: 12 }}>
            <p style={{ color: 'var(--t-secondary)', marginBottom: 14, fontSize: 13.5, lineHeight: 1.65 }}>
              {mode === 'quiz' ? `Ready to test your knowledge, ${profile?.name || 'Scholar'}?`
              : mode === 'explain' ? `Deep explanation mode — I'll break down any concept with examples.`
              : `Hi ${profile?.name || 'there'} — ask me anything about your studies.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK[mode].map((p, i) => (
                <button key={i} onClick={() => send(p)} style={{
                  padding: '10px 13px', borderRadius: 'var(--r-md)', border: '1px solid var(--b-default)',
                  background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer',
                  fontSize: 12.5, textAlign: 'left', lineHeight: 1.5, fontFamily: 'var(--f-body)',
                  transition: 'all 0.15s', boxShadow: 'var(--sh-xs)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue-border)'; e.currentTarget.style.color = 'var(--t-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b-default)'; e.currentTarget.style.color = 'var(--t-secondary)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 5, marginBottom: 4 }}>
            <div className={`msg msg-${m.role === 'user' ? 'user' : 'ai'}`}>
              <div style={{ lineHeight: 1.75, fontSize: 13.5 }}>{m.role === 'assistant' ? renderMessage(m.content) : m.content}</div>
            </div>
            {m.role === 'assistant' && (
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 9px', gap: 4 }} onClick={() => saveToNotes(m.content)}>
                  <Pin size={10} strokeWidth={2} /> Save
                </button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 9px', gap: 4 }} onClick={() => makeFlashcard(messages[i-1]?.content || 'Q', m.content)}>
                  <Layers size={10} strokeWidth={2} /> Card
                </button>
              </div>
            )}
          </div>
        ))}

        {typingText && (
          <div className="msg msg-ai" style={{ alignSelf: 'flex-start', fontSize: 13.5, lineHeight: 1.75 }}>
            {renderMessage(typingText)}<span style={{ animation: 'blink 0.8s infinite' }}>|</span>
          </div>
        )}
        {loading && !typingText && (
          <div className="msg msg-ai" style={{ alignSelf: 'flex-start' }}>
            <Loader size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite', color: 'var(--t-muted)' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 10, flexShrink: 0 }}>
        <input className="input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={mode === 'quiz' ? 'Type your answer or ask for a new question…' : 'Ask anything… (Enter to send)'}
          style={{ flex: 1 }} disabled={loading} />
        <button className="btn btn-primary btn-icon" onClick={() => send()} disabled={loading || !input.trim()}>
          <Send size={15} strokeWidth={1.8} />
        </button>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
