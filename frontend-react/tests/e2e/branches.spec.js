import { test, expect } from '@playwright/test';
import { BranchesPage } from '../pages/branches.page';

/*
 * The branch locator — the map and the region accordion — used to be the
 * homepage's closing block and was covered by home.spec.js. It is its own
 * route now (/branches, see RootCmp.jsx), so its cover moved with it.
 */
test.describe('Branches Page - Smoke Tests', () => {
  /** @type {BranchesPage} */
  let branchesPage;

  test.beforeEach(async ({ page }) => {
    branchesPage = new BranchesPage(page);
    await branchesPage.goto();
  });

  test('the page loads with its heading @smoke', async () => {
    await expect(branchesPage.heading).toBeVisible();
  });

  test('the branch map is displayed @smoke', async () => {
    // BUG-002: MapsCmp has no fallback if the Google Maps script is slow
    // or fails to load — the page can hang indefinitely instead of
    // degrading gracefully. Bounding this to 60s so a slow/failed load
    // fails fast and clearly, instead of consuming the whole CI job's
    // time budget. See bugs/BUG-002-maps-no-load-fallback.md.
    await expect(branchesPage.map).toBeVisible({ timeout: 60_000 });
  });

  test('the branch accordion is displayed @smoke', async () => {
    await expect(branchesPage.accordion).toBeVisible();
    await expect(branchesPage.regionToggles.first()).toBeVisible();
  });

  test('expanding a region reveals its branches @smoke', async () => {
    // Every region starts collapsed on this page, so the rows are the proof
    // that the accordion is wired up and not just rendering its summaries.
    await expect(branchesPage.branchRows.first()).toBeHidden();

    await branchesPage.expandFirstRegion();

    await expect(branchesPage.regionToggles.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(branchesPage.branchRows.first()).toBeVisible();
  });
});
