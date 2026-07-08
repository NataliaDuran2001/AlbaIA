import { expect, test } from "@playwright/test"
import { completeGuestToRoadmap } from "./helpers"

// Flow B: a guest can go idea → profile → roadmap without an account.
test("guest reaches a personalized roadmap", async ({ page }) => {
  await completeGuestToRoadmap(page)

  await expect(page).toHaveURL(/\/roadmap$/)

  // The roadmap h1 shows a concrete recommended structure.
  const heading = page.getByRole("heading", { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).not.toHaveText("")

  // And the save-progress CTA is present.
  await expect(page.getByRole("link", { name: /Save my progress/i })).toBeVisible()
})
