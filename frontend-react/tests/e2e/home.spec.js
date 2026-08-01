import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

test.describe('Homepage - Smoke Tests', () => {
  /** @type {HomePage} */
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('the page loads successfully with the correct title @smoke', async ({ page }) => {
    await expect(page).toHaveTitle(/React Starter - Coding Academy/);
  });

  test('the header is displayed @smoke', async () => {
    await expect(homePage.header).toBeVisible();
  });

  test('the branch map is displayed @smoke', async () => {
    // BUG-002: MapsCmp has no fallback if the Google Maps script is slow
    // or fails to load — the page can hang indefinitely instead of
    // degrading gracefully. Bounding this to 60s so a slow/failed load
    // fails fast and clearly, instead of consuming the whole CI job's
    // time budget. See bugs/BUG-002-maps-no-load-fallback.md.
    await expect(homePage.map).toBeVisible({ timeout: 60_000 });
  });

  test('the branch accordion is displayed @smoke', async () => {
    await expect(homePage.branchAccordion).toBeVisible();
  });

  test('the scroll-to-top button is not visible on initial load @smoke', async () => {
    await expect(homePage.scrollToTopButton).not.toHaveClass(/is-visible/);
  });
});