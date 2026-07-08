import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// Accessibility: landing, checklist and pricing free of serious/critical
// violations, plus a 44px hit-target check on primary CTAs.
// Checklist/pricing use the seeded free account.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo-free@albaia.gt")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/checklist", { timeout: 30_000 })
}

async function assertNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([])
}

test("landing has no serious a11y violations and a ≥44px CTA", async ({ page }) => {
  await page.goto("/")
  await assertNoSeriousViolations(page)

  const cta = page.getByRole("button", { name: /Analyze with AlbaIA/i })
  const box = await cta.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
})

test("checklist has no serious a11y violations", async ({ page }) => {
  await login(page)
  await assertNoSeriousViolations(page)
})

test("pricing has no serious a11y violations and ≥44px CTAs", async ({ page }) => {
  await login(page)
  await page.goto("/pricing")
  await assertNoSeriousViolations(page)

  const cta = page.getByRole("link", { name: /Select Basic/i })
  const box = await cta.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
})
