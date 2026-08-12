import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * RoboBrain LLM proxy (serverless).
 *
 * Keeps the real API key on the server; the browser only calls `/api/llm`.
 *
 * Env vars (configured in your hosting dashboard):
 *   OPENAI_API_KEY   – key for an OpenAI-compatible provider
 *   OPENAI_BASE_URL  – base URL (default https://api.openai.com/v1)
 *   OPENAI_MODEL     – model id (default gpt-4o-mini)
 *
 * When no key is present we return a deterministic canned response so the demo
 * still works offline — callers fall back to the local reasoner either way.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { messages, temperature = 0.2, max_tokens = 400 } = req.body ?? {}

  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    res.status(200).json({ text: cannedResponse(messages) })
    return
  }

  try {
    const r = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    })

    if (!r.ok) {
      res.status(200).json({ text: cannedResponse(messages) })
      return
    }

    const data = (await r.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content ?? ''
    res.status(200).json({ text: text.trim() })
  } catch {
    res.status(200).json({ text: cannedResponse(messages) })
  }
}

function cannedResponse(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const task = last?.content ?? ''
  return (
    `{"summary":"LLM provider not configured — serving the deterministic local reasoner. ` +
    `This is a placeholder for: ${task.slice(0, 120)}","llm":false}`
  )
}
