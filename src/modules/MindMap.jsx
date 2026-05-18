import React, { useState, useRef, useEffect, useCallback } from 'react'
import { RefreshCw, Download, Save, ZoomIn, ZoomOut, Maximize2, Layers, BookOpen, Sparkles, X, ChevronDown, ChevronRight } from 'lucide-react'
import { callClaude, parseJSON, showToast, storage, syllabusStore, getSubjectColor, addXP } from '../utils/index.js'

// ── Palette per branch index ──────────────────────────────────────────────
const BRANCH_COLORS = [
  { line: '#7c6fff', node: '#7c6fff22', text: '#a89eff', glow: '#7c6fff' },
  { line: '#f0a500', node: '#f0a50022', text: '#ffc533', glow: '#f0a500' },
  { line: '#4ecdc4', node: '#4ecdc422', text: '#7ee8e2', glow: '#4ecdc4' },
  { line: '#ff6b9d', node: '#ff6b9d22', text: '#ff9dc0', glow: '#ff6b9d' },
  { line: '#34d399', node: '#34d39922', text: '#6ee7b7', glow: '#34d399' },
  { line: '#fb923c', node: '#fb923c22', text: '#fdba74', glow: '#fb923c' },
  { line: '#60a5fa', node: '#60a5fa22', text: '#93c5fd', glow: '#60a5fa' },
  { line: '#f472b6', node: '#f47..22', text: '#f9a8d4', glow: '#f472b6' },
]

// ── Layout engine ─────────────────────────────────────────────────────────
function buildGraph(data, W, H) {
  if (!data?.branches) return { nodes: [], edges: [] }
  const cx = W / 2, cy = H / 2
  const nodes = [], edges = []
  const CENTER_R = 52

  nodes.push({ id: 'root', x: cx, y: cy, label: data.center, r: CENTER_R, level: 0, color: '#7c6fff', palette: null })

  const branches = data.branches || []
  branches.forEach((b, bi) => {
    const palette = BRANCH_COLORS[bi % BRANCH_COLORS.length]
    const angle = (bi / branches.length) * Math.PI * 2 - Math.PI / 2
    const BRANCH_DIST = Math.min(200, 140 + branches.length * 6)
    const bx = cx + Math.cos(angle) * BRANCH_DIST
    const by = cy + Math.sin(angle) * BRANCH_DIST
    const bid = `b${bi}`
    nodes.push({ id: bid, x: bx, y: by, label: b.label, r: 36, level: 1, color: palette.line, palette, angle })
    edges.push({ from: 'root', to: bid, palette, thick: true })

    const leaves = b.leaves || []
    leaves.forEach((leaf, li) => {
      const spread = Math.min(0.5, 0.28 + leaves.length * 0.03)
      const leafAngle = angle + (li - (leaves.length - 1) / 2) * spread
      const LEAF_DIST = 100 + Math.min(leaves.length * 4, 30)
      const lx = bx + Math.cos(leafAngle) * LEAF_DIST
      const ly = by + Math.sin(leafAngle) * LEAF_DIST
      const lid = `b${bi}l${li}`
      nodes.push({ id: lid, x: lx, y: ly, label: typeof leaf === 'string' ? leaf : leaf.text || leaf, r: 26, level: 2, color: palette.line, palette, parentId: bid })
      edges.push({ from: bid, to: lid, palette, thick: false })

      // sub-leaves (level 3)
      const subLeaves = typeof leaf === 'object' ? (leaf.children || []) : []
      subLeaves.forEach((sl, si) => {
        const slAngle = leafAngle + (si - (subLeaves.length - 1) / 2) * 0.35
        const slx = lx + Math.cos(slAngle) * 70
        const sly = ly + Math.sin(slAngle) * 70
        const slid = `${lid}s${si}`
        nodes.push({ id: slid, x: slx, y: sly, label: sl, r: 18, level: 3, color: palette.line, palette, parentId: lid })
        edges.push({ from: lid, to: slid, palette, thick: false })
      })
    })
  })
  return { nodes, edges }
}

// ── Canvas renderer ───────────────────────────────────────────────────────
function MindMapCanvas({ data, width, height, onNodeClick, highlightId }) {
  const canvasRef = useRef(null)
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(null)
  const [panDrag, setPanDrag] = useState(null)
  const nodesRef = useRef([])

  useEffect(() => {
    const g = buildGraph(data, width, height)
    setGraph(g)
    nodesRef.current = g.nodes
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [data, width, height])

  useEffect(() => { draw() }, [graph, pan, zoom, highlightId])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw edges
    graph.edges.forEach(e => {
      const from = graph.nodes.find(n => n.id === e.from)
      const to = graph.nodes.find(n => n.id === e.to)
      if (!from || !to) return
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2 - (e.thick ? 40 : 20)
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(mx, my, to.x, to.y)
      ctx.strokeStyle = e.palette.line
      ctx.lineWidth = e.thick ? 2.5 : 1.5
      ctx.globalAlpha = e.thick ? 0.6 : 0.4
      ctx.stroke()
      ctx.globalAlpha = 1
    })

    // Draw nodes
    graph.nodes.forEach(n => {
      const isHighlight = highlightId && n.id !== 'root' && n.label?.toLowerCase().includes(highlightId.toLowerCase())
      ctx.save()

      // Glow
      if (n.level <= 1 || isHighlight) {
        ctx.shadowColor = n.color
        ctx.shadowBlur = isHighlight ? 20 : n.level === 0 ? 18 : 10
      }

      // Background
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      if (n.level === 0) {
        const g = ctx.createRadialGradient(n.x - 10, n.y - 10, 4, n.x, n.y, n.r)
        g.addColorStop(0, '#a89eff')
        g.addColorStop(1, '#5b50cc')
        ctx.fillStyle = g
      } else {
        ctx.fillStyle = n.palette?.node || '#ffffff11'
      }
      ctx.fill()

      // Border
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.strokeStyle = isHighlight ? '#fff' : n.color
      ctx.lineWidth = isHighlight ? 2.5 : n.level === 0 ? 3 : n.level === 1 ? 2 : 1
      ctx.globalAlpha = n.level === 2 ? 0.5 : 0.8
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()

      // Text
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const fontSize = n.level === 0 ? 12 : n.level === 1 ? 10 : 9
      ctx.font = `${n.level <= 1 ? 600 : 400} ${fontSize}px -apple-system, system-ui`
      ctx.fillStyle = n.level === 0 ? '#fff' : (n.palette?.text || '#ccc')

      // Word wrap
      const words = n.label.split(' ')
      const maxW = (n.r - 6) * 2
      const lines = []
      let cur = ''
      words.forEach(w => {
        const test = cur ? cur + ' ' + w : w
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
        else cur = test
      })
      if (cur) lines.push(cur)
      const lh = fontSize + 2
      const startY = n.y - (lines.length - 1) * lh / 2
      lines.forEach((line, i) => ctx.fillText(line, n.x, startY + i * lh))
      ctx.restore()
    })

    ctx.restore()
  }, [graph, pan, zoom, highlightId])

  const getNodeAt = (ex, ey) => {
    const x = (ex - pan.x) / zoom
    const y = (ey - pan.y) / zoom
    return nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) <= n.r)
  }

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top
    const node = getNodeAt(ex, ey)
    if (node) { setDragging({ id: node.id, ox: ex, oy: ey, nx: node.x, ny: node.y }) }
    else setPanDrag({ ox: ex, oy: ey, px: pan.x, py: pan.y })
  }

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top
    if (dragging) {
      const dx = (ex - dragging.ox) / zoom, dy = (ey - dragging.oy) / zoom
      const nx = dragging.nx + dx, ny = dragging.ny + dy
      nodesRef.current = nodesRef.current.map(n => n.id === dragging.id ? { ...n, x: nx, y: ny } : n)
      setGraph(g => ({ ...g, nodes: nodesRef.current }))
    } else if (panDrag) {
      setPan({ x: panDrag.px + ex - panDrag.ox, y: panDrag.py + ey - panDrag.oy })
    }
    // Cursor
    const hit = getNodeAt(ex, ey)
    canvasRef.current.style.cursor = hit ? 'pointer' : (panDrag ? 'grabbing' : 'grab')
  }

  const onMouseUp = (e) => {
    if (dragging) {
      const rect = canvasRef.current.getBoundingClientRect()
      const ex = e.clientX - rect.left, ey = e.clientY - rect.top
      const moved = Math.hypot(ex - dragging.ox, ey - dragging.oy) < 5
      if (moved) {
        const node = graph.nodes.find(n => n.id === dragging.id)
        if (node) onNodeClick?.(node)
      }
    }
    setDragging(null); setPanDrag(null)
  }

  const onWheel = (e) => {
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)))
  }

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1) }

  const exportPNG = () => {
    const canvas = canvasRef.current
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'mindmap.png'; a.click()
  }

  return { canvasRef, onMouseDown, onMouseMove, onMouseUp, onWheel, zoom, setZoom, resetView, exportPNG }
}

// ── Subject/Topic picker ──────────────────────────────────────────────────
function SubjectTopicPicker({ profile, syllabusData, onSelect }) {
  const [expanded, setExpanded] = useState(null)

  const subjects = profile?.subjects || []
  const syllabusSubjects = syllabusData?.subjects || []

  // Merge: if syllabus has topic data use it, else just show subject
  const items = subjects.map(sub => {
    const syllSub = syllabusSubjects.find(s => s.name === sub)
    return {
      name: sub,
      topics: syllSub?.topics?.map(t => t.name) || [],
      highPriority: syllSub?.highPriority || []
    }
  })

  if (items.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(item => (
        <div key={item.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', background: expanded === item.name ? 'var(--bg-subtle)' : 'transparent', transition: 'background 0.1s' }}
            onClick={() => setExpanded(expanded === item.name ? null : item.name)}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSubjectColor(item.name, subjects), flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-primary)', flex: 1 }}>{item.name}</span>
            {item.topics.length > 0 && (
              expanded === item.name ? <ChevronDown size={12} color="var(--t-muted)" /> : <ChevronRight size={12} color="var(--t-muted)" />
            )}
            <button onClick={e => { e.stopPropagation(); onSelect(item.name, null) }}
              style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer' }}>
              Map
            </button>
          </div>
          {expanded === item.name && item.topics.length > 0 && (
            <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
              {item.topics.map(topic => (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}
                  onClick={() => onSelect(item.name, topic)}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-secondary)' }}>{topic}</span>
                  {item.highPriority.includes(topic) && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,107,107,0.12)', color: 'var(--rose)' }}>🔥</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function MindMap({ profile }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [tooltipCache, setTooltipCache] = useState({})
  const [tooltipLoading, setTooltipLoading] = useState(false)
  const [mode, setMode] = useState('pick') // 'pick' | 'custom' | 'map'
  const [customInput, setCustomInput] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [highlightText, setHighlightText] = useState('')
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 })
  const syllabusData = syllabusStore.get()

  useEffect(() => {
    const saved = storage.get('mindmap_last', null)
    if (saved) { setMapData(saved); setMode('map') }
  }, [])

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setCanvasSize({ w: Math.max(500, width), h: Math.max(420, Math.round(width * 0.62)) })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const generate = async (subject, topic) => {
    setLoading(true)
    setMode('map')

    const syllSub = syllabusData?.subjects?.find(s => s.name === subject)
    const syllabusCtx = syllSub
      ? `Syllabus context for ${subject}: High priority topics: ${syllSub.highPriority?.join(', ')}. Topics: ${syllSub.topics?.slice(0, 8).map(t => t.name).join(', ')}.`
      : ''

    const focus = topic ? `Topic: "${topic}" (part of ${subject})` : `Subject: "${subject}" — show major chapters/topics`

    const prompt = `You are a knowledge mapping expert creating a mind map for an exam student.
${focus}
${syllabusCtx}
${customInput ? `Additional context: "${customInput.slice(0, 800)}"` : ''}

Generate a comprehensive, exam-optimised mind map.
Return ONLY valid JSON:
{
  "center": "Topic or Subject Name",
  "branches": [
    {
      "label": "Main Branch / Chapter",
      "color": "#hexcolor",
      "leaves": [
        { "text": "Concept", "children": ["detail1", "detail2"] },
        { "text": "Formula or Key Point", "children": [] }
      ]
    }
  ]
}
Generate 6-8 branches, 3-5 leaves each with 0-2 children. Use distinct hex colors per branch. Focus on exam-relevant concepts, formulas, and connections.`

    const text = await callClaude(prompt, '', 3000)
    const data = parseJSON(text)
    if (data?.branches) {
      setMapData(data)
      storage.set('mindmap_last', data)
      addXP('note')
      showToast('Mind map generated!', 'success')
    } else {
      showToast('Failed to generate mind map', 'error')
      setMode('pick')
    }
    setLoading(false)
  }

  const generateFromCustom = async () => {
    if (!customInput.trim()) { showToast('Enter a topic or notes', 'warning'); return }
    await generate(selectedSubject || customInput.slice(0, 40), null)
  }

  const handleNodeClick = async (node) => {
    if (node.level === 0) return
    if (tooltipCache[node.label]) { setTooltip({ node, text: tooltipCache[node.label] }); return }
    setTooltip({ node, text: '' })
    setTooltipLoading(true)

    const syllCtx = syllabusData ? `Student is studying for ${profile?.examType || 'exam'}.` : ''
    const text = await callClaude(
      `${syllCtx} Explain "${node.label}" in 2-3 sentences for an exam student. Be precise and include any key formula or fact.`,
      '', 512
    )
    if (text) {
      setTooltipCache(p => ({ ...p, [node.label]: text }))
      setTooltip({ node, text })
    }
    setTooltipLoading(false)
  }

  const saveToNotes = () => {
    if (!mapData) return
    const notes = storage.get('notes', [])
    const content = `# ${mapData.center}\n\n` +
      (mapData.branches || []).map(b =>
        `## ${b.label}\n` + (b.leaves || []).map(l => {
          const text = typeof l === 'string' ? l : l.text
          const children = typeof l === 'object' ? (l.children || []) : []
          return `- ${text}` + (children.length ? '\n' + children.map(c => `  - ${c}`).join('\n') : '')
        }).join('\n')
      ).join('\n\n')
    notes.unshift({ id: Date.now(), title: mapData.center, subject: selectedSubject || 'Mind Map', content, created: new Date().toISOString(), wordCount: content.split(' ').length })
    storage.set('notes', notes)
    showToast('Saved to Notes!', 'success')
  }

  // Canvas hook
  const { canvasRef, onMouseDown, onMouseMove, onMouseUp, onWheel, zoom, setZoom, resetView, exportPNG } = MindMapCanvas({
    data: mapData, width: canvasSize.w, height: canvasSize.h, onNodeClick: handleNodeClick, highlightId: highlightText
  })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height) - var(--dock-height) - 40px)', gap: 14 }}>

      {/* ── Left panel ── */}
      <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', padding: 3, borderRadius: 8 }}>
          {[['pick', '📚 Subjects'], ['custom', '✏️ Custom']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m === mode && mode === 'map' ? m : m)}
              style={{ flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer', fontWeight: mode === m ? 600 : 400, background: mode === m ? 'var(--bg-card)' : 'transparent', color: mode === m ? 'var(--t-primary)' : 'var(--t-secondary)', boxShadow: mode === m ? 'var(--sh-xs)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Subject/Topic picker */}
        {(mode === 'pick' || mode === 'map') && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 10, padding: '10px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <BookOpen size={10} /> Subjects
            </div>
            <SubjectTopicPicker
              profile={profile}
              syllabusData={syllabusData}
              onSelect={(sub, topic) => { setSelectedSubject(sub); generate(sub, topic) }}
            />
            {(!profile?.subjects?.length) && (
              <p style={{ fontSize: 11, color: 'var(--t-muted)', textAlign: 'center', padding: '12px 0' }}>Complete onboarding to see subjects</p>
            )}
          </div>
        )}

        {/* Custom input */}
        {mode === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 12 }}
              value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">— Select Subject —</option>
              {(profile?.subjects || []).map(s => <option key={s}>{s}</option>)}
            </select>
            <textarea style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 12, resize: 'none', height: 100, outline: 'none', lineHeight: 1.6 }}
              value={customInput} onChange={e => setCustomInput(e.target.value)}
              placeholder="Enter a topic, paste notes, or describe concepts…" />
            <button onClick={generateFromCustom} disabled={loading || !customInput.trim()}
              style={{ padding: '8px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading || !customInput.trim() ? 0.5 : 1 }}>
              {loading ? 'Generating…' : '✦ Generate Map'}
            </button>
          </div>
        )}

        {/* Highlight search */}
        {mapData && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highlight</div>
            <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-primary)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search node…" value={highlightText} onChange={e => setHighlightText(e.target.value)} />
          </div>
        )}

        {/* Syllabus connection */}
        {syllabusData && mapData && (
          <div style={{ background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent)', marginBottom: 5 }}>📎 Syllabus Linked</div>
            <div style={{ fontSize: 10.5, color: 'var(--t-muted)', lineHeight: 1.5 }}>
              {syllabusData.subjects?.length} subjects · {syllabusData.totalEstimatedHours}h total
            </div>
          </div>
        )}

        {/* Map actions */}
        {mapData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <button onClick={saveToNotes} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
              💾 Save to Notes
            </button>
            <button onClick={exportPNG} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
              ⬇ Export PNG
            </button>
            <button onClick={() => { setMapData(null); setMode('pick') }} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--b-default)', background: 'var(--bg-card)', color: 'var(--t-secondary)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
              🗑 Clear Map
            </button>
          </div>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

        {/* Toolbar */}
        {mapData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 8 }}>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomIn size={13} />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={13} />
            </button>
            <button onClick={resetView} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--b-default)', background: 'transparent', color: 'var(--t-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Maximize2 size={12} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--t-muted)', marginLeft: 4 }}>{Math.round(zoom * 100)}%</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-primary)' }}>{mapData.center}</span>
            <div style={{ flex: 1 }} />
            {loading && <RefreshCw size={13} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--b-default)', borderRadius: 12, overflow: 'hidden' }}>

          {/* Loading overlay */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', zIndex: 10, gap: 14 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: 'absolute', inset: i * 12, borderRadius: '50%',
                    border: `2px solid transparent`, borderTopColor: ['#7c6fff', '#f0a500', '#4ecdc4'][i],
                    animation: `spin ${1 + i * 0.3}s linear infinite`
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--t-secondary)' }}>Building your mind map…</span>
            </div>
          )}

          {/* Empty state */}
          {!mapData && !loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ opacity: 0.35 }}>
                <circle cx="60" cy="60" r="20" fill="none" stroke="#7c6fff" strokeWidth="2" />
                <circle cx="60" cy="15" r="12" fill="#7c6fff" fillOpacity="0.4" />
                <circle cx="105" cy="82" r="11" fill="#f0a500" fillOpacity="0.4" />
                <circle cx="15" cy="82" r="11" fill="#4ecdc4" fillOpacity="0.4" />
                <circle cx="98" cy="25" r="9" fill="#ff6b9d" fillOpacity="0.3" />
                <circle cx="22" cy="25" r="9" fill="#34d399" fillOpacity="0.3" />
                <line x1="60" y1="40" x2="60" y2="27" stroke="#7c6fff" strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1="78" y1="68" x2="95" y2="73" stroke="#f0a500" strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1="42" y1="68" x2="25" y2="73" stroke="#4ecdc4" strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1="75" y1="46" x2="89" y2="31" stroke="#ff6b9d" strokeWidth="1.5" strokeOpacity="0.4" />
                <line x1="45" y1="46" x2="31" y2="31" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.4" />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t-primary)', marginBottom: 5 }}>Select a subject or topic</div>
                <div style={{ fontSize: 12.5, color: 'var(--t-muted)' }}>Or switch to Custom to enter your own notes</div>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ display: mapData && !loading ? 'block' : 'none', width: '100%', height: '100%' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          />

          {/* Node tooltip */}
          {tooltip && (
            <div style={{
              position: 'absolute', bottom: 14, right: 14, maxWidth: 260,
              background: 'var(--bg-card)', border: '1px solid var(--b-default)',
              borderRadius: 10, padding: '12px 14px', boxShadow: 'var(--sh-sm)',
              zIndex: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: tooltip.node.color }}>{tooltip.node.label}</span>
                <button onClick={() => setTooltip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-muted)', padding: 2 }}>
                  <X size={12} />
                </button>
              </div>
              {tooltipLoading
                ? <div style={{ fontSize: 11.5, color: 'var(--t-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Explaining…</div>
                : <p style={{ fontSize: 12, color: 'var(--t-secondary)', lineHeight: 1.65, margin: 0 }}>{tooltip.text}</p>
              }
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
