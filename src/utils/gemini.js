/**
 * ─── GEMINI API HANDLER ────────────────────────────────────────────────────
 * Fixed model: gemini-2.0-flash | Supports text + multimodal (PDF/image)
 */

const GEMINI_MODELS = [
  ...(import.meta.env.VITE_GEMINI_MODELS || import.meta.env.VITE_GEMINI_MODEL || 'gemini-3-flash-preview')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean),
  'gemini-2.5-flash',
  'gemini-2.0-flash'
].filter((model, index, models) => models.indexOf(model) === index)

const GEMINI_MODEL = GEMINI_MODELS[0]
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models'
const API_KEY      = import.meta.env.VITE_GEMINI_KEY || ''

const rateLimiter = {
  requests: [], RPM_LIMIT: 14, RPD_LIMIT: 1400, dailyCount: 0,
  dayKey: new Date().toDateString(),
  canRequest() {
    const today = new Date().toDateString()
    if (this.dayKey !== today) { this.dayKey = today; this.dailyCount = 0 }
    const now = Date.now()
    this.requests = this.requests.filter(t => now - t < 60_000)
    return this.dailyCount < this.RPD_LIMIT && this.requests.length < this.RPM_LIMIT
  },
  record() { this.requests.push(Date.now()); this.dailyCount++ },
  getStatus() {
    this.requests = this.requests.filter(t => Date.now() - t < 60_000)
    return { rpm: this.requests.length, rpd: this.dailyCount, rpmLimit: this.RPM_LIMIT, rpdLimit: this.RPD_LIMIT }
  }
}

let queueRunning = false
const requestQueue = []
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function processQueue() {
  if (queueRunning) return
  queueRunning = true
  while (requestQueue.length > 0) {
    const { resolve, reject, fn } = requestQueue.shift()
    try { resolve(await fn()) } catch (e) { reject(e) }
    if (requestQueue.length > 0) await sleep(250)
  }
  queueRunning = false
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn })
    processQueue()
  })
}

function extractGeminiErrorMessage(errorPayload, status) {
  const message = errorPayload?.error?.message || errorPayload?.message || ''
  const normalized = message.toLowerCase()

  if (normalized.includes('api key not valid') || normalized.includes('api_key_invalid') || normalized.includes('api key invalid')) {
    return 'Gemini API key is invalid or expired'
  }

  if (normalized.includes('permission') || normalized.includes('forbidden')) {
    return 'Gemini API key does not have permission for this model'
  }

  if (normalized.includes('model not found') || normalized.includes('not found') || normalized.includes('does not exist')) {
    return 'Gemini model is unavailable'
  }

  if (status) return message || `HTTP ${status}`
  return message || 'Unknown Gemini error'
}

async function doFetch(url, body, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.status === 429) {
        const wait = parseInt(res.headers.get('Retry-After') || '5') * 1000
        if (attempt < retries) { await sleep(wait); continue }
        throw new Error('RATE_LIMITED')
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message = extractGeminiErrorMessage(err, res.status)
        const error = new Error(message)
        error.status = res.status
        error.payload = err
        throw error
      }
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')
      rateLimiter.record()
      return text
    } catch (e) {
      if (attempt === retries) throw e
      await sleep(1000 * Math.pow(2, attempt))
    }
  }
}

function buildModelUrls(body) {
  return GEMINI_MODELS.map(model => ({
    model,
    url: `${GEMINI_BASE}/${model}:generateContent?key=${API_KEY}`,
    body
  }))
}

async function fetchWithModelFallback(body) {
  let lastError = null
  for (const entry of buildModelUrls(body)) {
    try {
      return await doFetch(entry.url, body)
    } catch (error) {
      lastError = error
      const status = error?.status
      const message = String(error?.message || '').toLowerCase()
      const modelUnavailable = status === 404 || status === 400 || message.includes('model is unavailable') || message.includes('not found')
      if (!modelUnavailable) throw error
    }
  }
  throw lastError || new Error('Gemini model is unavailable')
}

export async function callGemini(prompt, systemPrompt = '', maxTokens = 2048) {
  if (!API_KEY) throw new Error('VITE_GEMINI_KEY not set')
  if (!rateLimiter.canRequest()) throw new Error('CLIENT_RATE_LIMITED')
  const fullText = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
  const body = {
    contents: [{ parts: [{ text: fullText }] }],
    generationConfig: { maxOutputTokens: Math.min(maxTokens, 8192), temperature: 0.7, topP: 0.9 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ]
  }
  return enqueue(() => fetchWithModelFallback(body))
}

export async function callGeminiWithFiles(files, prompt, systemPrompt = '', maxTokens = 4096) {
  if (!API_KEY) throw new Error('VITE_GEMINI_KEY not set')
  if (!rateLimiter.canRequest()) throw new Error('CLIENT_RATE_LIMITED')
  const parts = []
  if (systemPrompt) parts.push({ text: systemPrompt })
  for (const f of files) {
    parts.push({ inline_data: { mime_type: f.mimeType || 'application/pdf', data: f.base64 } })
  }
  parts.push({ text: prompt })
  const body = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: Math.min(maxTokens, 8192), temperature: 0.6, topP: 0.9 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ]
  }
  return enqueue(() => fetchWithModelFallback(body))
}

export async function callGeminiChat(messages, systemPrompt = '', maxTokens = 1500) {
  if (!API_KEY) throw new Error('VITE_GEMINI_KEY not set')
  if (!rateLimiter.canRequest()) throw new Error('CLIENT_RATE_LIMITED')
  const contents = []
  let lastRole = null
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user' : 'model'
    if (role === lastRole) contents[contents.length - 1].parts[0].text += '\n' + msg.content
    else { contents.push({ role, parts: [{ text: msg.content }] }); lastRole = role }
  }
  if (contents[0]?.role !== 'user') contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] })
  const body = {
    system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.75, topP: 0.9 }
  }
  if (!body.system_instruction) delete body.system_instruction
  return enqueue(() => fetchWithModelFallback(body))
}

export function getAPIStatus() {
  const status = rateLimiter.getStatus()
  return {
    configured: !!API_KEY, model: GEMINI_MODEL, models: GEMINI_MODELS, ...status,
    rpmPercent: Math.round((status.rpm / (status.rpmLimit || 1)) * 100),
    rpdPercent: Math.round((status.rpd / (status.rpdLimit || 1)) * 100),
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
