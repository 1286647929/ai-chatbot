import { expect, test } from "@playwright/test";

test.describe("Legal default route", () => {
  test("renders legal UI at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "法律文书助手" })).toBeVisible();
  });

  test("/legal redirects to /", async ({ page }) => {
    await page.goto("/legal");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
