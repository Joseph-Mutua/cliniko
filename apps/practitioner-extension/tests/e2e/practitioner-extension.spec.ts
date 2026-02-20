import { test, expect } from "@playwright/test";

test("entry -> timeline -> send intake -> upload attachment", async ({ page }) => {
  await page.goto("/entry?patient_id=pat_123&clinic=demo-clinic");
  await expect(page.getByRole("heading", { name: /Companion Practitioner Extension/i })).toBeVisible();

  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Send intake" }).click();
  await page.getByRole("button", { name: "Send" }).first().click();

  await nav.getByRole("link", { name: "Upload" }).click();
  await page.getByRole("button", { name: "Upload" }).click();

  await nav.getByRole("link", { name: "Timeline" }).click();
  await expect(page.getByText(/Attachment/i).first()).toBeVisible();
});
