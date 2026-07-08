import { expect, test } from "@playwright/test"

// Flow C: a free user can visit pricing and back out with "Maybe later",
// premium stays locked, and /login always links to /signup.
// Requires the seed account demo-free@albaia.gt (npx tsx scripts/seed-demo.ts).
test("free user can decline pricing and keep premium locked", async ({ page }) => {
  await page.goto("/login")

  // Login must offer a path to create an account (never "contact support").
  await expect(page.getByRole("link", { name: /Create your account/i })).toHaveAttribute("href", "/signup")

  await page.getByLabel("Email").fill("demo-free@albaia.gt")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/checklist", { timeout: 30_000 })

  // Premium steps are locked on the free tier.
  await expect(page.getByText("Unlocks with", { exact: false }).first()).toBeVisible()

  // Go to pricing, then back out with "Maybe later".
  await page.getByRole("link", { name: /Subscribe to Unlock/i }).click()
  await page.waitForURL("**/pricing")
  await page.getByRole("link", { name: /Maybe later/i }).click()
  await page.waitForURL("**/checklist")

  // Still locked — no purchase was made.
  await expect(page.getByText("Unlocks with", { exact: false }).first()).toBeVisible()
})
