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
    // Default timeout, deliberately. This carried `{ timeout: 60_000 }` while
    // BUG-002 was open: the map was Google Maps, fetched at runtime, and a
    // slow or blocked script could hang the page forever — so the generous
    // ceiling stopped one stuck page from eating the whole CI job.
    //
    // Leaflet is bundled with the app, so the map renders on first paint and
    // there is no external script to wait on. A map that takes 60 seconds now
    // is a regression, not a slow network, and should fail fast and say so.
    // See bugs/BUG-002-maps-no-load-fallback.md.
    await expect(branchesPage.map).toBeVisible();
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
