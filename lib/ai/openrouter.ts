import "server-only"

/**
 * Cliente de IA genérico (API compatible con OpenAI) vía fetch.
 *
 * Un único punto de acceso para las dos funciones de IA de AlbaIA (el asistente
 * in-app y el análisis de roadmap). Server-side only: la key nunca llega al
 * cliente. Si no hay key configurada, `available()` devuelve false y cada
 * llamador cae a su fallback determinista.
 *
 * Proveedor configurable por env var — cualquier endpoint compatible con la
 * Chat Completions API de OpenAI (Fireworks, OpenRouter, Together, etc.):
 *   AI_API_KEY   la key del proveedor (requerida para activar la IA)
 *   AI_BASE_URL  base del endpoint, sin la ruta (default: Fireworks)
 *   AI_MODEL     ID del modelo por defecto
 *
 * Se conservan como fallback las variables OPENROUTER_* previas para no romper
 * entornos ya configurados; las AI_* tienen prioridad.
 */

// Base del endpoint (sin `/chat/completions`). Fireworks por defecto.
const BASE_URL = (
  process.env.AI_BASE_URL ||
  process.env.OPENROUTER_BASE_URL ||
  "https://api.fireworks.ai/inference/v1"
).replace(/\/$/, "")

const ENDPOINT = `${BASE_URL}/chat/completions`

const API_KEY = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY

export const DEFAULT_MODEL =
  process.env.AI_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "accounts/fireworks/models/llama-v3p3-70b-instruct"

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

/** true si hay una key de IA configurada. */
export function available(): boolean {
  return !!API_KEY
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  }
  // Atribución opcional (usada por OpenRouter; inofensiva en otros proveedores).
  const siteUrl = process.env.AI_SITE_URL || process.env.OPENROUTER_SITE_URL
  const siteName = process.env.AI_SITE_NAME || process.env.OPENROUTER_SITE_NAME
  if (siteUrl) h["HTTP-Referer"] = siteUrl
  if (siteName) h["X-Title"] = siteName
  return h
}

/**
 * Una llamada de chat completion. Devuelve el texto del primer choice, o lanza
 * si la key falta o la API responde con error. Los llamadores envuelven en
 * try/catch y caen a su fallback.
 */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  if (!available()) throw new Error("AI_API_KEY is not set.")

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
    throw new Error(`AI provider error ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("AI provider returned an empty completion.")
  return content
}
