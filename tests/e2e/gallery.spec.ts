import { expect, test } from "@playwright/test";

test("gallery smoke flow", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;

  test.skip(!baseUrl || !email || !password, "Set PLAYWRIGHT_BASE_URL and seeded owner credentials before running the smoke test.");

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill(email as string);
  await page.getByLabel("Password").fill(password as string);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard\/library$/);
  await page.goto(`${baseUrl}/dashboard/shares`);
  await page.getByLabel("Title").fill("Smoke share");
  await page.getByText("family").click();
  await page.getByRole("button", { name: "Create share" }).click();

  const sharePath = await page.locator("text=/\\/s\\//").first().textContent();

  if (sharePath) {
    await page.goto(`${baseUrl}${sharePath.trim()}`);
    await expect(page.getByText("Shared Gallery")).toBeVisible();
  }

  await page.goto(`${baseUrl}/dashboard/map`);
  await expect(page.getByText("Location panel")).toBeVisible();
});
