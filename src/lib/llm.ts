import type { ProviderId } from '@/types'

/**
 * LLM inference layer.
 *
 * The platform ships a fully-functional local deterministic engine, so it works
 * with zero configuration. When a provider key/endpoint is available we route
 * selected reasoning through an LLM and fall back to local logic on any error.
 *
 * For static hosting (Netlify/Vercel) the LLM call goes through a serverless
 * function (`/api/llm`) which holds the real API key — the browser never sees it.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmRequest {
  messages: LlmMessage[]
  /** 0–1 sampling temperature. */
  temperature?: number
  /** Max tokens to generate. */
  maxTokens?: number
  /** Caller tag for routing/logging on the server. */
  task: string
}

export interface LlmConfig {
  enabled: boolean
  endpoint: string
}

const LS_KEY = 'robobrain.llm.config.v1'

const DEFAULT_CONFIG: LlmConfig = {
  enabled: false,
  endpoint: '/api/llm',
}

export function loadLlmConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<LlmConfig>) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveLlmConfig(cfg: LlmConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg))
  } catch {
    /* ignore */
  }
}

export function toggleLlm(enabled: boolean): LlmConfig {
  const cfg = { ...loadLlmConfig(), enabled }
  saveLlmConfig(cfg)
  return cfg
}

export const providerLabel = (id: ProviderId): string =>
  id === 'llm' ? 'RoboBrain LLM Reasoner' : 'RoboBrain Local Reasoner v1'

export const providerModel = (id: ProviderId): string =>
  id === 'llm' ? 'robobrain-llm-v1' : 'robobrain-local-v1'

export function activeProviderId(): ProviderId {
  return loadLlmConfig().enabled ? 'llm' : 'local'
}

/**
 * Call the LLM endpoint. Returns null on any failure so callers can fall back
 * to deterministic logic — the platform never blocks on the network.
 */
export async function llmComplete(req: LlmRequest): Promise<string | null> {
  const cfg = loadLlmConfig()
  if (!cfg.enabled) return null
  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: req.messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 400,
        task: req.task,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { text?: string }
    return data.text?.trim() || null
  } catch {
    return null
  }
}

/** Best-effort JSON extraction from an LLM response. */
export function parseJson<T>(raw: string): T | null {
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
