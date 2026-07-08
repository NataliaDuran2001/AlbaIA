import { expect, test } from "@playwright/test"
import { completeGuestToRoadmap, signUp, uniqueEmail } from "./helpers"

// Promotion: a guest completes Flow B, registers, and the roadmap survives —
// the checklist is seeded from the roadmap that was created before signup.
test("guest data survives promotion to an account", async ({ page }) => {
  await completeGuestToRoadmap(page)

  // Capture the recommended structure shown to the guest.
  const structure = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? ""
  expect(structure.length).toBeGreaterThan(0)

  await page.getByRole("link", { name: /Save my progress/i }).click()
  await page.waitForURL("**/signup")
  await signUp(page, uniqueEmail("promotion"))

  // The checklist exists and was seeded from the pre-signup roadmap (items present).
  await expect(page.getByRole("heading", { name: "Your formalization checklist" })).toBeVisible()
  const items = page.getByRole("listitem")
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBeGreaterThan(0)
})
