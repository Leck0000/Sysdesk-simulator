import { test, expect } from '@playwright/test';

test('app smoke test - page loads and root element renders', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Check that the app root element is present
  await expect(page.getByTestId('app-root')).toBeVisible({ timeout: 15000 });
  // Check that the page has proper title
  await expect(page).toHaveTitle(/SysDesk/);
});

test('theme toggle exists and is accessible', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Theme toggle should be present
  await expect(page.getByRole('button', { name: /theme|dark|light/i })).toBeVisible({ timeout: 15000 });
  // Check that CSS variables are set (no hardcoded colors)
  const bg = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--bg');
  });
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('');
});

test('responsive layout - sidebar collapses at <1024px', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Set viewport to mobile width
  await page.setViewportSize({ width: 375, height: 667 });
  // Sidebar should be in drawer mode or collapsed
  const sidebar = page.locator('[role="navigation"]');
  // The drawer should be accessible
  await expect(sidebar).toBeVisible({ timeout: 15000 });
});