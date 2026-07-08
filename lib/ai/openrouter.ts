import "server-only"

/**
 * Cliente mínimo de OpenRouter (API compatible con OpenAI) vía fetch.
 *
 * Un único punto de acceso para las dos funciones de IA de AlbaIA (el asistente
 * in-app y el análisis de roadmap). Server-side only: la key nunca llega al
 * cliente. Si OPENROUTER_API_KEY no está seteada, `available()` devuelve false y
 * cada llamador cae a su fallback determinista.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o"

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  /** Fuerza salida JSON (response_format: json_object) para análisis estructurado. */
  json?: boolean
}

/** true si hay una key de OpenRouter configurada. */
export function available(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  }
  // Atribución opcional que OpenRouter muestra en su dashboard.
  if (process.env.OPENROUTER_SITE_URL) h["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL
  if (process.env.OPENROUTER_SITE_NAME) h["X-Title"] = process.env.OPENROUTER_SITE_NAME
  return h
}

/**
 * Una llamada de chat completion. Devuelve el texto del primer choice, o lanza
 * si la key falta o la API responde con error. Los llamadores envuelven en
 * try/catch y caen a su fallback.
 */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  if (!available()) throw new Error("OPENROUTER_API_KEY is not set.")

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("OpenRouter returned an empty completion.")
  return content
}
