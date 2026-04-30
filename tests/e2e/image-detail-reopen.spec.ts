import { expect, test, type Page } from "@playwright/test";

async function expectDetailImageVisible(page: Page) {
  await page.waitForFunction(() => {
    const imageNodes = Array.from(document.images).filter((img) =>
      img.src.includes("aliyuncs.com")
    );
    const hasVisibleMainImage = imageNodes.some((img) => {
      const opacity = getComputedStyle(img).opacity;
      return opacity === "1" && img.complete && img.naturalWidth > 0;
    });

    return hasVisibleMainImage && !document.querySelector("svg.lucide-zoom-in");
  });
}

test("reopening the same image keeps the detail image visible", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  const email = "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin";

  test.skip(!baseUrl, "Set PLAYWRIGHT_BASE_URL before running the image detail reopen test.");

  await page.goto(`${baseUrl}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard\/library$/);

  const firstThumbnail = page.locator('img[alt]').first();
  await expect(firstThumbnail).toBeVisible();
  const targetAlt = await firstThumbnail.getAttribute("alt");

  test.skip(!targetAlt, "No gallery image is available for the reopen regression test.");

  const thumbnail = page.locator(`img[alt="${targetAlt}"]`).first();

  await thumbnail.click();
  await expect(page).toHaveURL(/\/dashboard\/library\/.+$/);
  await expectDetailImageVisible(page);

  await page.locator("button").filter({ has: page.locator("svg.lucide-x") }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/library$/);

  await page.locator(`img[alt="${targetAlt}"]`).first().click();
  await expect(page).toHaveURL(/\/dashboard\/library\/.+$/);
  await expectDetailImageVisible(page);
});
