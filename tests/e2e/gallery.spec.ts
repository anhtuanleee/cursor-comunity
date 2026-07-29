import { expect, test } from "@playwright/test";

test.describe("creative gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-tour="reference-card"]').first()).toBeVisible();
  });

  test("clicking anywhere on a card opens the intercepted detail modal", async ({ page }) => {
    const card = page.locator('[data-tour="reference-card"]').first();
    await card.click({ position: { x: 12, y: 12 } });

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /.+/ }).last()).toBeVisible();
    await expect(page).toHaveURL(/\/[0-9a-f-]+$/i);
  });

  test("card actions do not open the detail modal", async ({ page }) => {
    const card = page.locator('[data-tour="reference-card"]').first();
    const action = card.getByRole("button", { name: /Focus together|End focus/ }).first();

    await action.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("comment action opens the comment panel without navigating", async ({ page }) => {
    const card = page.locator('[data-tour="reference-card"]').first();
    await card.getByRole("button", { name: "Comment" }).click();

    await expect(page.getByRole("textbox", { name: "Add a comment" })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("closing the detail modal returns to the gallery", async ({ page }) => {
    const card = page.locator('[data-tour="reference-card"]').first();
    await card.click({ position: { x: 12, y: 12 } });
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Close reference details" }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});
