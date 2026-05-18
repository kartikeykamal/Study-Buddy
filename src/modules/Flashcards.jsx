import React, { useState, useEffect, useRef } from 'react'
import { Plus, Shuffle, RotateCcw, Trash2, Edit2, ChevronDown, ChevronRight, Sparkles, BookOpen, Check, X, RefreshCw } from 'lucide-react'
import { storage, callClaude, parseJSON, showToast, addXP, getSubjectColor, syllabusStore } from '../utils/index.js'

// ── Study session ─────────────────────────────────────────────────────────
function StudyMode({ deck, onDone }) {
  const [cards, setCards] = useState(() => [...deck.cards].sort(() => Math.random() - 0.5))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); setFlipped(p => !p) }
      if (e.key === '1') rate('again')
      if (e.key === '2') rate('hard')
      if (e.key === '3') rate('good')
      if (e.key === '4') rate('easy')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, flipped, cards])

  const rate = (rating) => {
    if (!flipped) return
    const newResults = [...results, { card: cards[idx], rating }]
    if (rating === 'again') {
      const remaining = [...cards.slice(idx + 1), { ...cards[idx], _retry: true }]
      setCards([...cards.slice(0, idx), ...remaining])
    }
    if (idx + 1 >= cards.length && rating !== 'again') {
      setResults(newResults); setDone(true); addXP('flashcard_session')
    } else {
      setResults(newResults); setIdx(p => p + 1); setFlipped(false)
    }
  }

  if (done) {
    const good = results.filter(r => r.rating === 'good' || r.rating === 'easy').length
    const mastery = Math.round((good / results.length) * 100)
    const time = Math.round((Date.now() - startTime) / 60000)
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 460, margin: '0 auto' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Session Complete!</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, margin: '20px 0 28px' }}>
          <div><div style={{ fontSize: 32, fontWeight: 800, color: 'var(--mint)', fontFamily: 'JetBrains Mono' }}>{mastery}%</div><div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Mastery</div></div>
          <div><div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{results.length}</div><div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Cards</div></div>
          <div><div style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{time}m</div><div style={{ fontSize: 11, color: 'var(--t-muted)' }}>Time</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => { setCards([...deck.cards].sort(() => Math.random() - 0.5)); setIdx(0); setFlipped(false); setResults([]); setDone(false) }}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 13 }}>
            🔁 Study Again
          </button>
          <button onClick={onDone} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ← Back to Decks
          </button>
        </div>
      </div>
    )
  }

  const card = cards[idx]
  const pct = Math.round((idx / cards.length) * 100)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <style>{`
        .fc-scene { width: 100%; height: 220px; perspective: 1000px; cursor: pointer; margin-bottom: 20px; }
        .fc-inner { position: relative; width: 100%; height: 100%; transition: transform 0.45s cubic-bezier(.4,0,.2,1); transform-style: preserve-3d; }
        .fc-inner.flipped { transform: rotateY(180deg); }
        .fc-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 14px; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; border: 1px solid var(--b-default); }
        .fc-front { background: var(--bg-card); }
        .fc-back { background: var(--bg-subtle); transform: rotateY(180deg); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
        <button onClick={onDone} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12 }}>← Back</button>
        <span style={{ fontSize: 12.5, color: 'var(--t-muted)' }}>Card {idx + 1} of {cards.length}</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{pct}%</span>
      </div>

      <div style={{ height: 4, background: 'var(--b-subtle)', borderRadius: 99, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>

      <div className="fc-scene" onClick={() => setFlipped(p => !p)}>
        <div className={`fc-inner ${flipped ? 'flipped' : ''}`}>
          <div className="fc-face fc-front">
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Question</div>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, color: 'var(--t-primary)' }}>{card.front}</div>
              <div style={{ marginTop: 18, fontSize: 11, color: 'var(--t-ghost)' }}>Tap to reveal · Space</div>
            </div>
          </div>
          <div className="fc-face fc-back">
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Answer</div>
              <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--t-primary)' }}>{card.back}</div>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[['again', '🔁', 'Again', 'var(--rose)'], ['hard', '😓', 'Hard', 'var(--amber)'], ['good', '👍', 'Good', 'var(--blue)'], ['easy', '⭐', 'Easy', 'var(--mint)']].map(([r, icon, label, color]) => (
            <button key={r} onClick={() => rate(r)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 18px', borderRadius: 10, border: `1px solid ${color}33`,
              background: `${color}11`, cursor: 'pointer', color, fontSize: 11, fontWeight: 600
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>{label}
            </button>
          ))}
        </div>
      )}
      {!flipped && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t-ghost)', marginTop: 10 }}>After revealing: 1=Again 2=Hard 3=Good 4=Easy</div>}
    </div>
  )
}

// ── Subject/Topic picker ──────────────────────────────────────────────────
function SyllabusTopicPicker({ profile, syllabusData, selected, onSelect }) {
  const [expanded, setExpanded] = useState(null)
  const subjects = profile?.subjects || []
  const syllSubjects = syllabusData?.subjects || []

  const items = subjects.map(sub => {
    const syl = syllSubjects.find(s => s.name === sub)
    return { name: sub, topics: syl?.topics?.map(t => t.name) || [], highPriority: syl?.highPriority || [] }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(item => (
        <div key={item.name}>
          <div onClick={() => setExpanded(expanded === item.name ? null : item.name)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 6, cursor: 'pointer', background: selected?.subject === item.name && !selected?.topic ? 'var(--blue-bg)' : 'transparent' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(item.name, subjects), flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-primary)', flex: 1 }}>{item.name}</span>
            {item.topics.length > 0 && (expanded === item.name ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
          </div>
          {expanded === item.name && item.topics.map(topic => (
            <div key={topic} onClick={() => onSelect({ subject: item.name, topic })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px 4px 20px', cursor: 'pointer', borderRadius: 5, background: selected?.topic === topic ? 'var(--blue-bg)' : 'transparent' }}>
              <span style={{ fontSize: 11, color: 'var(--t-secondary)', flex: 1 }}>{topic}</span>
              {item.highPriority.includes(topic) && <span style={{ fontSize: 9, color: 'var(--rose)' }}>🔥</span>}
              {selected?.topic === topic && <Check size={10} color="var(--blue)" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Flashcards({ profile }) {
  const [decks, setDecks] = useState([])
  const [activeDeck, setActiveDeck] = useState(null)
  const [studying, setStudying] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newDeck, setNewDeck] = useState({ name: '', subject: profile?.subjects?.[0] || '' })
  const [aiPanel, setAiPanel] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTarget, setAiTarget] = useState({ subject: '', topic: '' })
  const [cardCount, setCardCount] = useState(15)
  const [editCard, setEditCard] = useState(null)
  const [filterSubject, setFilterSubject] = useState('All')
  const syllabusData = syllabusStore.get()

  useEffect(() => { setDecks(storage.get('flashcards', [])) }, [])

  const save = (updated) => { setDecks(updated); storage.set('flashcards', updated) }

  const createDeck = () => {
    if (!newDeck.name.trim()) { showToast('Enter deck name', 'warning'); return }
    const deck = { id: Date.now(), name: newDeck.name, subject: newDeck.subject, cards: [], created: new Date().toISOString() }
    const updated = [deck, ...decks]; save(updated)
    setActiveDeck(deck); setShowCreate(false); setNewDeck({ name: '', subject: profile?.subjects?.[0] || '' })
  }

  const deleteDeck = (id) => {
    const updated = decks.filter(d => d.id !== id); save(updated)
    if (activeDeck?.id === id) setActiveDeck(updated[0] || null)
  }

  const generateCards = async () => {
    if (!activeDeck) { showToast('Select or create a deck first', 'warning'); return }
    if (!aiTarget.subject && !aiTarget.topic) { showToast('Select a subject or topic', 'warning'); return }
    setAiLoading(true)

    const syllSub = syllabusData?.subjects?.find(s => s.name === aiTarget.subject)
    const topicData = syllSub?.topics?.find(t => t.name === aiTarget.topic)
    const syllCtx = topicData
      ? `Subtopics to cover: ${topicData.subtopics?.join(', ')}. Key formulas: ${topicData.keyFormulas?.join(', ')}.`
      : syllSub ? `High priority topics for ${aiTarget.subject}: ${syllSub.highPriority?.join(', ')}.` : ''

    const prompt = `Generate ${cardCount} high-quality flashcard Q&A pairs for:
Subject: ${aiTarget.subject || activeDeck.subject}
${aiTarget.topic ? `Topic: ${aiTarget.topic}` : ''}
Exam: ${profile?.examType || 'competitive exam'}
${syllCtx}

Include a mix of:
- Definitions and key terms
- Formula-based questions
- Conceptual understanding
- Application questions
- "What is the difference between X and Y" type

Return ONLY valid JSON array:
[{"question":"...","answer":"...","type":"definition|formula|concept|application"}]`

    const text = await callClaude(prompt, '', 3000)
    const cards = parseJSON(text, [])
    if (cards.length) {
      const newCards = cards.map((c, i) => ({ id: Date.now() + i, front: c.question, back: c.answer, mastery: 0, type: c.type }))
      const updated = decks.map(d => d.id === activeDeck.id ? { ...d, cards: [...d.cards, ...newCards] } : d)
      save(updated); setActiveDeck(updated.find(d => d.id === activeDeck.id))
      showToast(`${cards.length} cards added!`, 'success')
      setAiPanel(false)
    } else showToast('Generation failed', 'error')
    setAiLoading(false)
  }

  const addCard = () => {
    if (!activeDeck) return
    const card = { id: Date.now(), front: '', back: '', mastery: 0 }
    const updated = decks.map(d => d.id === activeDeck.id ? { ...d, cards: [card, ...d.cards] } : d)
    save(updated); setActiveDeck(updated.find(d => d.id === activeDeck.id))
    setEditCard(card)
  }

  const saveCard = (card) => {
    const updated = decks.map(d => d.id === activeDeck.id ? { ...d, cards: d.cards.map(c => c.id === card.id ? card : c) } : d)
    save(updated); setActiveDeck(updated.find(d => d.id === activeDeck.id)); setEditCard(null)
  }

  const deleteCard = (cardId) => {
    const updated = decks.map(d => d.id === activeDeck.id ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d)
    save(updated); setActiveDeck(updated.find(d => d.id === activeDeck.id))
  }

  const shuffleDeck = () => {
    if (!activeDeck) return
    const shuffled = { ...activeDeck, cards: [...activeDeck.cards].sort(() => Math.random() - 0.5) }
    const updated = decks.map(d => d.id === activeDeck.id ? shuffled : d)
    save(updated); setActiveDeck(shuffled); showToast('Deck shuffled!', 'success')
  }

  if (studying && activeDeck) return <StudyMode deck={activeDeck} onDone={() => setStudying(false)} />

  const filteredDecks = decks.filter(d => filterSubject === 'All' || d.subject === filterSubject)

  return (
    <div style={{ display: 'flex', gap: 14, height: 'calc(100vh - var(--topbar-height) - var(--dock-height) - 40px)' }}>

      {/* ── Deck list ── */}
      <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <button onClick={() => setShowCreate(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={13} /> New Deck
        </button>

        {showCreate && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 9, padding: 11 }}>
            <input value={newDeck.name} onChange={e => setNewDeck(p => ({ ...p, name: e.target.value }))}
              placeholder="Deck name" onKeyDown={e => e.key === 'Enter' && createDeck()}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-subtle)', color: 'var(--t-primary)', fontSize: 12, marginBottom: 6, boxSizing: 'border-box', outline: 'none' }} />
            <select value={newDeck.subject} onChange={e => setNewDeck(p => ({ ...p, subject: e.target.value }))}
              style={{ width: '100%', padding: '5px 7px', borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-subtle)', color: 'var(--t-primary)', fontSize: 12, marginBottom: 8 }}>
              {(profile?.subjects || []).map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={createDeck} style={{ width: '100%', padding: '6px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Create</button>
          </div>
        )}

        {/* Subject filter */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['All', ...(profile?.subjects || [])].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, border: `1px solid ${filterSubject === s ? 'var(--blue-border)' : 'var(--b-default)'}`, background: filterSubject === s ? 'var(--blue-bg)' : 'transparent', color: filterSubject === s ? 'var(--blue)' : 'var(--t-muted)', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filteredDecks.map(d => {
            const mastery = d.cards.length ? Math.round(d.cards.filter(c => c.mastery > 0).length / d.cards.length * 100) : 0
            const active = activeDeck?.id === d.id
            return (
              <div key={d.id} onClick={() => setActiveDeck(d)} style={{ padding: '9px 11px', borderRadius: 9, border: `1px solid ${active ? 'var(--blue-border)' : 'var(--b-default)'}`, background: active ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: getSubjectColor(d.subject, profile?.subjects) }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteDeck(d.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-ghost)', padding: 2 }}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t-muted)', marginBottom: 4 }}>{d.cards.length} cards · {mastery}% mastered</div>
                <div style={{ height: 3, background: 'var(--b-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${mastery}%`, height: '100%', background: 'var(--mint)', borderRadius: 99 }} />
                </div>
              </div>
            )
          })}
          {filteredDecks.length === 0 && <p style={{ fontSize: 11, color: 'var(--t-muted)', textAlign: 'center', padding: 20 }}>No decks yet</p>}
        </div>
      </div>

      {/* ── Deck detail ── */}
      {activeDeck ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--t-primary)' }}>{activeDeck.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--t-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: getSubjectColor(activeDeck.subject, profile?.subjects) }} />
                {activeDeck.subject} · {activeDeck.cards.length} cards
              </div>
            </div>
            <button onClick={() => setAiPanel(p => !p)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${aiPanel ? 'var(--blue-border)' : 'var(--b-default)'}`, background: aiPanel ? 'var(--blue-bg)' : 'var(--bg-card)', color: aiPanel ? 'var(--blue)' : 'var(--t-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={12} /> AI Generate
            </button>
            <button onClick={shuffleDeck} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <Shuffle size={12} /> Shuffle
            </button>
            <button onClick={addCard} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12 }}>
              + Card
            </button>
            <button onClick={() => activeDeck.cards.length ? setStudying(true) : showToast('Add cards first', 'warning')}
              style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              ▶ Study
            </button>
          </div>

          {/* AI panel */}
          {aiPanel && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--blue-border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-primary)', marginBottom: 10 }}>✦ AI Generate Cards — Pick Subject & Topic</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: 'var(--bg-subtle)', borderRadius: 8, padding: '8px 10px', maxHeight: 180, overflowY: 'auto' }}>
                  <SyllabusTopicPicker
                    profile={profile} syllabusData={syllabusData}
                    selected={aiTarget}
                    onSelect={t => setAiTarget(t)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 180 }}>
                  {aiTarget.subject && (
                    <div style={{ fontSize: 11.5, color: 'var(--accent)', padding: '4px 8px', background: 'var(--blue-bg)', borderRadius: 6 }}>
                      {aiTarget.subject}{aiTarget.topic ? ` → ${aiTarget.topic}` : ''}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Cards to generate: {cardCount}</div>
                    <input type="range" min="5" max="30" step="5" value={cardCount} onChange={e => setCardCount(+e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  </div>
                  <button onClick={generateCards} disabled={aiLoading || (!aiTarget.subject && !aiTarget.topic)}
                    style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', opacity: aiLoading || (!aiTarget.subject && !aiTarget.topic) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {aiLoading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : '✦ Generate Cards'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards grid */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeDeck.cards.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--t-muted)' }}>
                <div style={{ fontSize: 36 }}>🃏</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No cards yet</div>
                <div style={{ fontSize: 12.5 }}>Use AI to generate cards or add manually</div>
                <button onClick={() => setAiPanel(true)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>✦ Generate with AI</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                {activeDeck.cards.map(card => (
                  <div key={card.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '12px 13px', position: 'relative' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-primary)', marginBottom: 7, lineHeight: 1.4 }}>{card.front || 'Empty question'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-muted)', borderTop: '1px solid var(--b-subtle)', paddingTop: 7, lineHeight: 1.4 }}>{card.back || 'Empty answer'}</div>
                    {card.type && <div style={{ marginTop: 6, fontSize: 9.5, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.type}</div>}
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 3 }}>
                      <button onClick={() => setEditCard(card)} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--bg-subtle)', color: 'var(--t-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={10} />
                      </button>
                      <button onClick={() => deleteCard(card.id)} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--bg-subtle)', color: 'var(--rose)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={10} />
                      </button>
                    </div>
                    {card.mastery > 0 && <div style={{ position: 'absolute', bottom: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--t-muted)' }}>
          <div style={{ fontSize: 40 }}>🃏</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t-primary)' }}>Flashcard Forge</div>
          <p style={{ fontSize: 13, textAlign: 'center' }}>Create a deck or select one to start studying</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Deck</button>
        </div>
      )}

      {/* Edit card modal */}
      {editCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 420, background: 'var(--bg-card)', borderRadius: 14, padding: 22, border: '1px solid var(--b-default)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Edit Card</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)', marginBottom: 5, textTransform: 'uppercase' }}>Front (Question)</div>
            <textarea value={editCard.front} onChange={e => setEditCard(p => ({ ...p, front: e.target.value }))}
              style={{ width: '100%', height: 85, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-subtle)', color: 'var(--t-primary)', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 10, boxSizing: 'border-box', lineHeight: 1.5 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)', marginBottom: 5, textTransform: 'uppercase' }}>Back (Answer)</div>
            <textarea value={editCard.back} onChange={e => setEditCard(p => ({ ...p, back: e.target.value }))}
              style={{ width: '100%', height: 85, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-subtle)', color: 'var(--t-primary)', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 14, boxSizing: 'border-box', lineHeight: 1.5 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditCard(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', fontSize: 12.5 }}>Cancel</button>
              <button onClick={() => saveCard(editCard)} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>Save Card</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
