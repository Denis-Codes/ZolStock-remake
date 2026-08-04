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
    await expect(page).toHaveTitle(/זול סטוק/);
  });

  test('the header is displayed @smoke', async () => {
    await expect(homePage.header).toBeVisible();
  });

  test('the deals band renders products @smoke', async () => {
    await expect(homePage.dealsHeading).toBeVisible();
    // HomeDeals fetches, so the band starts as skeletons — waiting on the
    // first real card is what distinguishes "loaded" from "still loading"
    // or from the error/empty fallbacks that render in the same slot.
    await expect(homePage.dealCards.first()).toBeVisible();
  });

  test('the category tiles are displayed @smoke', async () => {
    await expect(homePage.categoryTiles).toBeVisible();
    await expect(homePage.categoryTile('כלי בית')).toBeVisible();
  });

  test('the closing band links through to the branch locator @smoke', async ({ page }) => {
    // The map and the branch accordion moved off this page to /branches;
    // what the homepage still owes a shopper is a way to get there. The
    // locator itself is covered in branches.spec.js.
    await homePage.openBranches();
    await expect(page).toHaveURL(/\/branches$/);
  });

  test('the scroll-to-top button is not visible on initial load @smoke', async () => {
    await expect(homePage.scrollToTopButton).not.toHaveClass(/is-visible/);
  });
});
