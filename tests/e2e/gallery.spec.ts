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
  await expect(page.getByRole("link", { name: "图库" })).toBeVisible();
  await expect(page.getByRole("link", { name: "相册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "首页" })).toHaveCount(0);

  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard\/library$/);

  await page.goto(`${baseUrl}/dashboard/albums?view=timeline`);
  await expect(page.getByText("时间线视图")).toBeVisible();
  await expect(page.getByText("照片总数")).toBeVisible();

  await page.goto(`${baseUrl}/dashboard/shares`);
  await page.getByLabel("标题").fill("冒烟分享");
  await page.getByRole("checkbox", { name: "家庭" }).check();
  await page.getByRole("button", { name: "创建分享" }).click();

  const shareText = await page.locator("text=/\\/s\\//").first().textContent();
  const sharePath = shareText?.match(/\/s\/[A-Za-z0-9_-]+/)?.[0];

  if (sharePath) {
    await page.goto(`${baseUrl}${sharePath}`);
    await expect(page.getByRole("heading", { name: "冒烟分享" })).toBeVisible();
  }

  await page.goto(`${baseUrl}/dashboard/map`);
  await expect(page.getByText("位置面板")).toBeVisible();
});
