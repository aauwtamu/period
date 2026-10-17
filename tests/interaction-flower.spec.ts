import { expect, test } from "@playwright/test";

test("the brand flower pops on clicks anywhere", async ({ page }, testInfo) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Find your nearest products" });
  const burst = page.locator(".interaction-flower-burst");

  if (testInfo.project.name === "desktop") {
    await link.hover();
    await expect(burst).toHaveCount(0);
  }

  await page.getByRole("heading", { name: /Periods happen/ }).click();
  await expect(burst).toHaveCount(1);
  await expect(burst).toHaveCount(0);
  await link.click();
  await expect(page).toHaveURL(/#inventory$/);
  await expect(burst).toHaveCount(1);
  await expect(burst).toHaveCount(0);
});
