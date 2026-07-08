"use server"

import "server-only"
import { catalogForPrompt } from "@/lib/ai/catalog"
import { available as openRouterAvailable, chatCompletion } from "@/lib/ai/openrouter"

export interface AssistantMessage {
  role: "user" | "assistant"
  content: string
}

const SYSTEM_PROMPT = `You are Alba AI's in-app assistant. You help users who are formalizing a business in Guatemala understand the process, the required steps, and how to navigate the app. Be concise, warm, and practical. Answer in the language the user writes in (English or Spanish).

You can explain:
- What each formalization step means and why it is required.
- The difference between steps that ask for a DATA value (DPI, NIT, address, tax regime) and steps that require a document UPLOAD (notarized deed, commercial registry filing, sanitary license).
- How to use the app: Process (the checklist), Status (progress tracking), Documents (captured data + uploads), Catalog (verified lawyers & accountants), Support, and the subscription plans.
- That sensitive data (DPI, NIT, address) is encrypted at rest.

Formalization step catalog for reference:
${catalogForPrompt()}

Rules:
- Do NOT give definitive legal or tax advice; for personalized legal/accounting questions, point users to the verified professionals in the Catalog (requires the right subscription).
- Keep answers under ~120 words unless the user asks for detail.
- If you don't know something specific to their account, say so and suggest where to look in the app.`

/** Scripted fallback used when the Anthropic API key is missing or the call fails. */
function fallbackReply(userText: string): string {
  const q = userText.toLowerCase()
  if (q.includes("upload") || q.includes("document") || q.includes("subir") || q.includes("documento")) {
    return "Some steps ask you to type a value (like your DPI or NIT) and others ask you to upload a document (like a notarized deed). On the Process page, steps show either an “Enter” field or an “Upload document” button depending on what they need."
  }
  if (q.includes("encrypt") || q.includes("cifr") || q.includes("privac") || q.includes("segur")) {
    return "Your sensitive data — DPI, NIT and address — is encrypted at rest (AES-256-GCM) and only shown to you, masked. You can review how we handle data on the Privacy Policy page."
  }
  if (q.includes("plan") || q.includes("subscri") || q.includes("precio") || q.includes("suscri")) {
    return "The free stage covers your idea analysis and roadmap. To keep going you’ll need a plan: Basic (solo formalization), Professional (specialist call + priority review), or Enterprise (lawyer/accountant credits + partner scheduling). See the Pricing page."
  }
  return "I can help you understand each formalization step, whether it needs a value or a document, and how to move through the app. Try the Handbook for a full walkthrough, or ask me about a specific step. (Live AI answers activate once the assistant is fully configured.)"
}

/**
 * Ask the in-app assistant. Uses OpenRouter when OPENROUTER_API_KEY is set;
 * otherwise (or on any error) returns a helpful scripted fallback so the widget
 * always works. Mirrors the resilience pattern in lib/ai/analyze.ts.
 */
export async function askAssistant(
  history: AssistantMessage[],
  userText: string,
): Promise<{ ok: true; reply: string; live: boolean }> {
  const trimmed = userText.trim()
  if (!trimmed) return { ok: true, reply: fallbackReply(""), live: false }

  if (!openRouterAvailable()) {
    return { ok: true, reply: fallbackReply(trimmed), live: false }
  }

  try {
    const recent = history.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    const reply = await chatCompletion(
      [{ role: "system", content: SYSTEM_PROMPT }, ...recent, { role: "user", content: trimmed }],
      { maxTokens: 512, temperature: 0.5 },
    )
    return { ok: true, reply: reply || fallbackReply(trimmed), live: true }
  } catch {
    return { ok: true, reply: fallbackReply(trimmed), live: false }
  }
}
