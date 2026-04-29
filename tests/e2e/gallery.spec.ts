import { expect, test } from "@playwright/test";

test("gallery smoke flow", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  const email = "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin";

  test.skip(!baseUrl, "Set PLAYWRIGHT_BASE_URL before running the smoke test.");

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/dashboard\/library$/);
  await page.goto(`${baseUrl}/dashboard/shares`);
  await page.getByLabel("标题").fill("冒烟分享");
  await page.getByText("家庭").click();
  await page.getByRole("button", { name: "创建分享" }).click();

  const sharePath = await page.locator("text=/\\/s\\//").first().textContent();

  if (sharePath) {
    await page.goto(`${baseUrl}${sharePath.trim()}`);
    await expect(page.getByText("共享图库")).toBeVisible();
  }

  await page.goto(`${baseUrl}/dashboard/map`);
  await expect(page.getByText("位置面板")).toBeVisible();
});
