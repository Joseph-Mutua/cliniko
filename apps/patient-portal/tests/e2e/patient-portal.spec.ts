import { test, expect } from "@playwright/test";

test("entry -> home -> fill form -> upload attachment -> billing", async ({ page }) => {
  await page.goto("/demo/entry?token=dev-token");
  await expect(page.getByRole("heading", { name: /Cliniko Companion/i })).toBeVisible();

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByText(/Next appointment|Upcoming care/i)).toBeVisible();

  await page.getByRole("link", { name: "Forms" }).click();
  await page.getByRole("link", { name: "Open" }).first().click();

  await page.getByLabel("Pain level (1-10)").fill("6");
  await page.getByLabel("Current symptoms").fill("Stiffness after activity");
  await page.getByLabel("I consent to treatment").check();
  await page.getByRole("button", { name: /Submit form/i }).click();

  await page.getByRole("link", { name: "Uploads" }).click();
  await page.locator("input").first().fill("referral-letter.pdf");
  await page.getByRole("button", { name: /Upload file/i }).click();
  await expect(page.getByText(/referral-letter.pdf/i)).toBeVisible();

  await page.getByRole("link", { name: "Billing" }).click();
  await expect(page.getByText(/inv_1/i)).toBeVisible();
});
