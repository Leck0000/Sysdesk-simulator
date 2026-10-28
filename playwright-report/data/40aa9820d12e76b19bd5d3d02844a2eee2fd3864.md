# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> responsive layout - sidebar collapses at <1024px
- Location: tests\e2e\smoke.spec.ts:25:1

# Error details

```
Error: page.goto: NS_ERROR_NET_EMPTY_RESPONSE
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Page snapshot

```yaml
- article [ref=e3]:
  - generic [ref=e6]:
    - heading "Looks like there’s a problem with this site" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - text: The server at
      - strong [ref=e9]: localhost:3000
      - text: "sent back an error: 404 Not Found"
    - generic [ref=e10]:
      - heading "What can you do about it?" [level=3] [ref=e11]
      - list [ref=e12]:
        - listitem [ref=e13]: Check to make sure you’ve typed the website address correctly.
        - listitem [ref=e14]: The site could be temporarily unavailable or too busy. Try again in a few moments.
    - button "Try Again" [ref=e17]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('app smoke test - page loads and root element renders', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await page.waitForLoadState('networkidle');
  6  |   // Check that the app root element is present
  7  |   await expect(page.getByTestId('app-root')).toBeVisible({ timeout: 15000 });
  8  |   // Check that the page has proper title
  9  |   await expect(page).toHaveTitle(/SysDesk/);
  10 | });
  11 | 
  12 | test('theme toggle exists and is accessible', async ({ page }) => {
  13 |   await page.goto('/');
  14 |   await page.waitForLoadState('networkidle');
  15 |   // Theme toggle should be present
  16 |   await expect(page.getByRole('button', { name: /theme|dark|light/i })).toBeVisible({ timeout: 15000 });
  17 |   // Check that CSS variables are set (no hardcoded colors)
  18 |   const bg = await page.evaluate(() => {
  19 |     return getComputedStyle(document.documentElement).getPropertyValue('--bg');
  20 |   });
  21 |   expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  22 |   expect(bg).not.toBe('');
  23 | });
  24 | 
  25 | test('responsive layout - sidebar collapses at <1024px', async ({ page }) => {
> 26 |   await page.goto('/');
     |              ^ Error: page.goto: NS_ERROR_NET_EMPTY_RESPONSE
  27 |   await page.waitForLoadState('networkidle');
  28 |   // Set viewport to mobile width
  29 |   await page.setViewportSize({ width: 375, height: 667 });
  30 |   // Sidebar should be in drawer mode or collapsed
  31 |   const sidebar = page.locator('[role="navigation"]');
  32 |   // The drawer should be accessible
  33 |   await expect(sidebar).toBeVisible({ timeout: 15000 });
  34 | });
  35 | 
  36 | test('ticket queue loads and displays tickets', async ({ page }) => {
  37 |   await page.goto('/');
  38 |   await page.waitForLoadState('networkidle');
  39 |   // Check that ticket queue is present
  40 |   await expect(page.getByTestId('ticket-queue')).toBeVisible({ timeout: 15000 });
  41 |   // Check that at least one ticket card is present
  42 |   await expect(page.getByTestId('ticket-card')).toBeVisible({ timeout: 15000 });
  43 | });
  44 | 
  45 | test('authentication flows', async ({ page }) => {
  46 |   await page.goto('/');
  47 |   await page.waitForLoadState('networkidle');
  48 |   // Check that login is accessible
  49 |   await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible({ timeout: 15000 });
  50 | });
  51 | 
```