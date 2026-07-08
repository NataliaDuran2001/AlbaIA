import { expect, test } from "@playwright/test"
import { completeGuestToRoadmap, signUp, uniqueEmail } from "./helpers"

// Flow A: full journey to a subscribed checklist, registering and buying Basic.
test("full journey unlocks premium after checkout", async ({ page }) => {
  await completeGuestToRoadmap(page)

  // Save progress → create account.
  await page.getByRole("link", { name: /Save my progress/i }).click()
  await page.waitForURL("**/signup")
  await signUp(page, uniqueEmail("flow-a"))

  // Checklist seeded; a premium step is locked before subscribing.
  await expect(page.getByRole("heading", { name: "Your formalization checklist" })).toBeVisible()

  // Go to pricing and pick Basic.
  await page.getByRole("link", { name: /Subscribe to Unlock/i }).click()
  await page.waitForURL("**/pricing")
  await page.getByRole("link", { name: /Select Basic/i }).click()

  // Checkout (demo mode) → pay.
  await page.waitForURL(/\/checkout\?plan=basic/)
  await page.getByLabel("Name on card").fill("Test User")
  await page.getByLabel("Email").fill("test@albaia.test")
  await page.getByLabel("Card number").fill("4242 4242 4242 4242")
  await page.getByLabel("Expiry").fill("12/29")
  await page.getByLabel("CVC").fill("123")
  await page.getByRole("button", { name: /Pay \$15 and activate/i }).click()

  await page.waitForURL("**/checkout/success**", { timeout: 30_000 })
  await expect(page.getByRole("heading", { name: "Subscription active" })).toBeVisible()

  // Back on the checklist, premium steps are no longer locked.
  await page.goto("/checklist")
  await expect(page.getByText("Unlocks with", { exact: false })).toHaveCount(0)
})
