import { test, expect } from "@playwright/test";

// Read-only UI checks against the configured sheet. No take/report is submitted.
test("inventory is responsive, searchable, and handles denied location", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (value: object) => void,
        ) => error({ code: 1, message: "Denied" }),
      },
    });
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/tamuperiod\./);
  await expect(
    page.getByRole("heading", { name: "Periods happen. We’ve got you." }),
  ).toBeVisible();
  await expect(page.locator(".restroom-row").first()).toBeVisible();
  const total = await page.locator(".restroom-row").count();
  expect(total).toBeGreaterThan(0);
  await expect(page.locator(".stat-number").first()).not.toHaveText("—");
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .getByRole("textbox", { name: "Search building or room" })
    .fill("not-a-real-room");
  await expect(page.getByText("No locations found.")).toBeVisible();
  await page.getByRole("textbox", { name: "Search building or room" }).fill("");
  await expect(page.locator(".restroom-row")).toHaveCount(total);
  const building =
    (await page
      .getByRole("combobox", { name: "Filter by building" })
      .locator("option")
      .nth(1)
      .getAttribute("value")) ||
    (await page
      .getByRole("combobox", { name: "Filter by building" })
      .locator("option")
      .nth(1)
      .textContent());
  await page
    .getByRole("combobox", { name: "Filter by building" })
    .selectOption({ label: building! });
  for (const label of await page
    .locator(".location-name strong")
    .allTextContents())
    expect(label).toBe(building);
  await page
    .getByRole("combobox", { name: "Filter by building" })
    .selectOption("");
  await page.getByRole("button", { name: "Sort by proximity" }).click();
  await expect(
    page.getByRole("button", { name: "Sort by proximity" }),
  ).toHaveAttribute("aria-pressed", "false");

  const reportButton = page
    .getByRole("button", { name: "Request restock" })
    .first();
  if (await reportButton.count()) {
    await reportButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request a restock?" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("report-dialog.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(reportButton).toBeFocused();
  }
  expect(errors).toEqual([]);
});
