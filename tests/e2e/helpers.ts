import { expect, type Page } from "@playwright/test"

// Landing → idea → analyzing → profile → analyzing/roadmap → /roadmap, all as a guest.
export async function completeGuestToRoadmap(page: Page) {
  await page.goto("/")
  await page.getByLabel("Describe your business idea").fill(
    "A small bakery in Guatemala City selling custom cakes and coffee.",
  )
  await page.getByRole("button", { name: /Analyze with AlbaIA/i }).click()

  await page.waitForURL("**/profile", { timeout: 30_000 })
  await page.getByRole("radio", { name: "Just me" }).check()
  await page.getByLabel("Industry").selectOption("food")
  await page.getByLabel("Operating city").fill("Guatemala City")
  await page.getByRole("button", { name: "Continue" }).click()

  await page.waitForURL("**/roadmap", { timeout: 30_000 })
  await expect(page.getByText("Recommended structure", { exact: false })).toBeVisible()
}

export async function signUp(page: Page, email: string, password = "demo1234") {
  await page.getByLabel("Full name").fill("Test User")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL("**/checklist", { timeout: 30_000 })
}

export function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}@albaia.test`
}
