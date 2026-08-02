import { test, expect } from '@playwright/test';
import { AppHeaderPage } from '../pages/app-header.page';
import { HomePage } from '../pages/home.page';

// The hamburger button only renders below the 1200px breakpoint ($bp-lg —
// it's display:none above that), so this whole file runs at a narrow,
// mobile-style viewport instead of the suite's default desktop size.
test.use({ viewport: { width: 500, height: 900 } });

test.describe('Header Navigation - Smoke Tests', () => {
  test('hamburger menu opens, navigates to a category, and closes @smoke', async ({ page }) => {
    const homePage = new HomePage(page);
    const appHeaderPage = new AppHeaderPage(page);

    await homePage.goto();

    await appHeaderPage.openMenu();
    await expect(appHeaderPage.drawer).toBeVisible();
    await expect(appHeaderPage.categoryLink('רהיטים')).toBeVisible();

    await appHeaderPage.navigateToCategory('רהיטים');

    // Navigating via a category link should both route correctly and
    // close the drawer — closeAndReset() calls onNavigate + handleClose
    // together, so this one assertion pair covers both behaviors.
    await expect(page).toHaveURL(/\/category\/furniture/);
    await expect(appHeaderPage.drawer).not.toBeVisible();
  });
});