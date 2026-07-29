// @ts-check
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

test.describe('Homepage - Smoke Tests', () => {
  /** @type {HomePage} */
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('the page loads successfully with the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/React Starter - Coding Academy/);
  });

  test('the header is displayed', async () => {
    await expect(homePage.header).toBeVisible();
  });

  test('the branch map is displayed', async () => {
    await expect(homePage.map).toBeVisible();
  });

  test('the branch accordion is displayed', async () => {
    await expect(homePage.branchAccordion).toBeVisible();
  });

  test('the scroll-to-top button is not visible on initial load', async () => {
    await expect(homePage.scrollToTopButton).not.toHaveClass(/is-visible/);
  });
});