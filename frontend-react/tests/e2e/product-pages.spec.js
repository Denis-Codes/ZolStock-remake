import { test, expect } from '@playwright/test';
import { ProductIndexPage } from '../pages/product-index.page';
import { ProductDetailsPage } from '../pages/product-details.page';
import { pickInStockProduct } from '../utils/pick-product';

test.describe('Product Pages - Smoke Tests', () => {

  test('the product listing page loads and displays products @smoke', async ({ page }) => {
    const productIndexPage = new ProductIndexPage(page);

    // "furniture" is a known-valid category slug (confirmed directly
    // against products.json's own category field, and against the
    // category ids used in the header's nav dropdowns) — not derived
    // from a specific product, so this doesn't carry the same routing
    // risk we hit earlier when picking a product first and assuming
    // its `category` field matched a real route.
    await productIndexPage.gotoCategory('furniture');

    // A direct check that the page actually rendered products, rather
    // than silently showing the empty state or having crashed. This is
    // exactly the kind of check that would have caught the earlier
    // ProductDetails/SearchResultsPage crashes directly, instead of only
    // catching them incidentally via the cart flow test.
    await expect(productIndexPage.anyProductCard()).toBeVisible();
    await expect(productIndexPage.emptyState).not.toBeVisible();
  });

  test('the product details page loads without crashing @smoke', async ({ page }) => {
    const product = pickInStockProduct();
    if (!product) throw new Error('Test data: expected at least one in-stock product');

    const productDetailsPage = new ProductDetailsPage(page);
    await productDetailsPage.goto(product.id);

    // Both of these existing were exactly the elements that stopped
    // rendering during the earlier Rules-of-Hooks crash on this page —
    // a direct, standalone check here means that class of bug gets
    // caught immediately, without depending on the cart flow test
    // happening to reach this page in just the right way.
    await expect(productDetailsPage.title).toBeVisible();
    await expect(productDetailsPage.addToCartBtn).toBeVisible();
  });
});