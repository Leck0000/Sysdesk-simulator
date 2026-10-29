import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Window stacking: opening every Windows app from the sidebar launcher must
 * never cover the launcher. No fixed pixel offsets: every position check is
 * derived from the launcher button's own bounding box at runtime, and
 * clickability is checked with Playwright's hit-target test (`trial` click)
 * plus elementFromPoint over a grid spanning each button.
 */

// The six Windows apps (Terminal is a shell, not a Windows app; it is used as
// the final "is the launcher still clickable" probe).
const WINDOWS_APPS = [
  ['EventViewer', 'Event Viewer'],
  ['ServicesPanel', 'Services'],
  ['RegistryEditor', 'Registry Editor'],
  ['NetworkPanel', 'Network Connections'],
  ['ADUsersComputers', 'AD Users and Computers'],
  ['FileExplorer', 'File Explorer'],
] as const;

const SCREENSHOT_DIR = 'screenshots';

/**
 * True when the button is the topmost element across its whole area: a 5x3
 * grid of points inside its bounding box (inset 2px for sub-pixel edges) must all hit the button.
 * Catches partial overlap, not just a covered centre.
 */
async function isUncovered(button: Locator): Promise<boolean> {
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const xs = [0, 0.25, 0.5, 0.75, 1].map((f) => r.left + 2 + f * (r.width - 4));
    const ys = [0, 0.5, 1].map((f) => r.top + 2 + f * (r.height - 4));
    return xs.every((x) =>
      ys.every((y) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && (hit === el || el.contains(hit));
      })
    );
  });
}

async function assertLauncherUsable(page: Page) {
  const launcher = page.getByRole('list', { name: 'Windows tools' });
  await expect(launcher).toBeVisible();
  for (const button of await launcher.getByRole('button').all()) {
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport();
    // Hit-target check: throws if another element (e.g. a window) would receive the click.
    await button.click({ trial: true, timeout: 2_000 });
    expect(await isUncovered(button), `${await button.innerText()} is (partly) covered`).toBe(true);
  }
}

async function openAllWindowsApps(page: Page) {
  const dialogs = page.getByRole('dialog');
  for (const [i, [key, title]] of WINDOWS_APPS.entries()) {
    // A normal click: fails with "intercepts pointer events" if a window covers the button.
    await page.getByTestId(`launch-${key}`).click({ timeout: 5_000 });
    await expect(dialogs).toHaveCount(i + 1);
    await expect(page.getByRole('dialog', { name: new RegExp(`^${title} — `) })).toBeVisible();
  }
}

test.describe('window stacking vs sidebar launcher', () => {
  test('desktop layout: launcher stays visible and clickable after opening all six Windows apps', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./?demo=1');
    await expect(page.getByTestId('app-root')).toBeVisible();

    await openAllWindowsApps(page);
    await assertLauncherUsable(page);

    // Prove it really is clickable: launching one more app opens a 7th window.
    await page.getByTestId('launch-Terminal').click({ timeout: 5_000 });
    await expect(page.getByRole('dialog')).toHaveCount(7);
    await assertLauncherUsable(page);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/window-stacking-desktop.png` });
  });

  test('drawer layout (<1024px): launcher in the open drawer stays clickable above the windows', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('./?demo=1');
    await expect(page.getByTestId('app-root')).toBeVisible();

    await page.getByRole('button', { name: 'Open filters and tools' }).click();
    await expect(page.getByTestId('sidebar')).toBeInViewport();

    await openAllWindowsApps(page);
    await assertLauncherUsable(page);

    await page.getByTestId('launch-Terminal').click({ timeout: 5_000 });
    await expect(page.getByRole('dialog')).toHaveCount(7);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/window-stacking-drawer.png` });
  });
});
