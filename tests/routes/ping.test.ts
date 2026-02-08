import { expect, test } from "@playwright/test";

test("GET /ping returns pong", async ({ page }) => {
  const response = await page.goto("/ping");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("pong")).toBeVisible();
});
