import { callGemini, callGeminiWithFiles, fileToBase64 } from './gemini.js'

// ─── STORAGE ───────────────────────────────────────────────────────────────
const NS = 'sb_v1_'
export const storage = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem(NS + key); return v ? JSON.parse(v) : fallback }
    catch { return fallback }
  },
  set: (key, val) => {
    try { localStorage.setItem(NS + key, JSON.stringify(val)) } catch {}
  },
  remove: (key) => localStorage.removeItem(NS + key),
  clearAll: () => {
    Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k))
  }
}

// ─── AI API ─────────────────────────────────────────────────────────────────
let loadingCount = 0
const setLoading = (on) => {
  loadingCount += on ? 1 : -1
  const bar = document.getElementById('loading-bar')
  if (bar) bar.style.display = loadingCount > 0 ? 'block' : 'none'
}

export async function callClaude(prompt, systemPrompt = '', maxTokens = 2048) {
  setLoading(true)
  try {
    return await callGemini(
      prompt,
      systemPrompt || 'You are StudyBuddy AI, a helpful academic assistant. Be concise and accurate.',
      maxTokens
    )
  } catch (e) {
    console.error('Gemini API error:', e)
    showToast(
      e.message === 'CLIENT_RATE_LIMITED'
        ? 'Rate limit — wait a moment'
        : e.message || 'AI unavailable — check API key',
      'error'
    )
    return null
  } finally {
    setLoading(false)
  }
}

export async function callClaudeWithPDFs(files, prompt, systemPrompt = '', maxTokens = 4096) {
  setLoading(true)
  try {
    const fileData = await Promise.all(
      files.map(async (f) => ({
        base64: await fileToBase64(f),
        mimeType: f.type || 'application/pdf'
      }))
    )
    return await callGeminiWithFiles(
      fileData,
      prompt,
      systemPrompt || 'You are StudyBuddy AI, analyzing academic documents to help students study effectively.',
      maxTokens
    )
  } catch (e) {
    console.error('Gemini PDF error:', e)
    showToast(e.message || 'PDF analysis failed — check API key', 'error')
    return null
  } finally {
    setLoading(false)
  }
}

export function parseJSON(text, fallback = null) {
  if (!text) return fallback
  try {
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) try { return JSON.parse(match[0]) } catch {}
    return fallback
  }
}

// ─── TOAST ──────────────────────────────────────────────────────────────────
export function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ─── DATE HELPERS ───────────────────────────────────────────────────────────
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── XP SYSTEM ──────────────────────────────────────────────────────────────
export const XP_ACTIONS = {
  login: 5, note: 5, task: 10, flashcard_session: 15,
  mock_test: 20, streak_bonus: 10, quiz: 10, pyq: 15, syllabus: 10
}

export function addXP(action) {
  const streak = storage.get('streak', { xp: 0, level: 1, streak: 0, lastDate: null })
  streak.xp = (streak.xp || 0) + (XP_ACTIONS[action] || 5)
  streak.level = Math.floor(streak.xp / 100) + 1
  const today = todayStr()
  if (streak.lastDate !== today) {
    if (streak.lastDate === yesterday()) streak.streak = (streak.streak || 0) + 1
    else if (streak.lastDate !== today) streak.streak = 1
    streak.lastDate = today
  }
  storage.set('streak', streak)
  return streak
}

function yesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export const LEVEL_NAMES = [
  'Seeker','Learner','Student','Scholar','Thinker','Explorer','Analyst',
  'Researcher','Expert','Master','Sage','Luminary','Oracle','Visionary',
  'Architect','Philosopher','Genius','Legend','Mythic','Transcendent'
]

export function getLevel(xp) {
  const lvl = Math.min(20, Math.floor((xp || 0) / 100) + 1)
  return { level: lvl, name: LEVEL_NAMES[lvl - 1], progress: ((xp || 0) % 100), xpToNext: 100 - ((xp || 0) % 100) }
}

// ─── SUBJECT COLORS ─────────────────────────────────────────────────────────
const SUBJECT_COLORS = ['#7c6fff','#f0a500','#4ecdc4','#ff6b9d','#a78bfa','#34d399','#fb923c','#60a5fa','#f472b6','#a3e635']
export function getSubjectColor(name, subjects = []) {
  const idx = subjects.findIndex(s => s === name)
  return SUBJECT_COLORS[((idx >= 0 ? idx : name?.charCodeAt(0) || 0)) % SUBJECT_COLORS.length]
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
export function addNotification(msg, icon = '📌') {
  const notifs = storage.get('notifications', [])
  notifs.unshift({ id: Date.now(), msg, icon, read: false, time: new Date().toISOString() })
  storage.set('notifications', notifs.slice(0, 20))
}

// ─── SYLLABUS STORE (shared context) ────────────────────────────────────────
export const syllabusStore = {
  get: () => storage.get('syllabus_analysis', null),
  set: (data) => storage.set('syllabus_analysis', data),
  getTopics: () => {
    const s = storage.get('syllabus_analysis', null)
    return s?.topics?.map(t => t.name) || []
  },
  getSummary: () => {
    const s = storage.get('syllabus_analysis', null)
    if (!s) return ''
    return `Syllabus covers: ${s.topics?.slice(0,5).map(t=>t.name).join(', ')}. High priority: ${s.highPriority?.join(', ')}`
  }
}
