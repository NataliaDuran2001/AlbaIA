"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const file = formData.get("file") as File | null
  const checklistItemId = (formData.get("checklistItemId") as string | null) || null
  if (!file || file.size === 0) return { ok: false, error: "No file selected." }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  // Path is prefixed with the user id so storage RLS scopes access per user.
  const path = `${user.id}/${checklistItemId ?? "general"}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  })
  if (uploadError) return { ok: false, error: uploadError.message }

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    checklist_item_id: checklistItemId,
    storage_path: path,
    status: "submitted",
  })
  if (insertError) return { ok: false, error: insertError.message }

  if (checklistItemId) {
    await supabase.from("checklist_items").update({ status: "submitted" }).eq("id", checklistItemId).eq("user_id", user.id)
  }

  revalidatePath("/checklist")
  revalidatePath("/finalize")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function getSignedDocumentUrl(path: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }
  // Storage RLS already restricts to the owner's folder; the signed URL is short-lived.
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 10)
  if (error || !data) return { ok: false, error: error?.message ?? "Could not sign URL." }
  return { ok: true, url: data.signedUrl }
}
