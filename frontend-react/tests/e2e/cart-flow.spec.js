import { test, expect } from '@playwright/test';
import { ProductIndexPage } from '../pages/product-index.page';
import { ProductDetailsPage } from '../pages/product-details.page';
import { CartPage } from '../pages/cart.page';
import productsData from '../../src/data/products.json' with { type: 'json' };

// Picking real products from the actual data source at runtime, rather than
// hardcoding names, so the test doesn't silently rot if product data changes.
function pickInStockProduct(excludeIds = []) {
  return productsData.find((p) => p.inStock && !excludeIds.includes(p.id));
}

function pickProductWithVariants(excludeIds = []) {
  return productsData.find((p) => (p.variants?.length ?? 0) > 0 && !excludeIds.includes(p.id));
}

test.describe('Cart - Happy Path', () => {

  test('adding a plain product from the listing reaches the cart correctly @smoke', async ({ page }) => {
    const productA = pickInStockProduct();
    if (!productA) throw new Error('Test data: expected at least one in-stock product');

    const titleA = productA.displayNameHe || productA.name;

    const productIndexPage = new ProductIndexPage(page);
    const cartPage = new CartPage(page);

    await productIndexPage.gotoSearch(titleA);
    await productIndexPage.addProductToCart(titleA);

    await cartPage.goto();
    await expect(cartPage.heading).toBeVisible();
    await expect(cartPage.item(titleA)).toBeVisible();
    await expect(cartPage.itemQuantity(titleA)).toHaveText('1');
  });

  test('🐛 KNOWN BUG (BUG-001): adding a configured product (variant + quantity) from PDP reaches the cart correctly @regression', async ({ page }) => {
    // BUG-001: quantity selected on the PDP is never applied to the cart —
    // AddToCartBtn hardcodes quantity to 1 and ProductDetails.jsx never
    // passes a quantity prop. See bugs/BUG-001-pdp-quantity-not-applied.md.
    // Remove this line once the bug is fixed; if the fix is correct the
    // test will then pass normally instead of being reported as expected-fail.
    test.fail(true, 'BUG-001: PDP quantity is not applied when adding to cart');

    const productB = pickProductWithVariants();
    if (!productB) throw new Error('Test data: expected at least one product with variants');

    const variants = productB.variants;
    if (!variants?.length) throw new Error('Test data: expected productB to have variants');

    const titleB = productB.displayNameHe || productB.name;
    const targetVariant = variants[0];

    const productDetailsPage = new ProductDetailsPage(page);
    const cartPage = new CartPage(page);

    await productDetailsPage.goto(productB.id);
    if (targetVariant.size) await productDetailsPage.selectSize(targetVariant.size);
    if (targetVariant.colorHe) await productDetailsPage.selectColor(targetVariant.colorHe);
    await productDetailsPage.increaseQuantity(1); // 1 -> 2
    await expect(productDetailsPage.quantityValue).toHaveText('2');
    await productDetailsPage.addToCart();

    await cartPage.goto();
    await expect(cartPage.item(titleB)).toBeVisible();
    if (targetVariant.size) {
      await expect(cartPage.itemVariantText(titleB)).toContainText(targetVariant.size);
    }
    // This is the assertion BUG-001 breaks — cart shows "1" instead of "2".
    await expect(cartPage.itemQuantity(titleB)).toHaveText('2');
  });
});import { test, expect } from '@playwright/test';
import { ProductIndexPage } from '../pages/product-index.page';
import { ProductDetailsPage } from '../pages/product-details.page';
import { CartPage } from '../pages/cart.page';
import { pickInStockProduct, pickProductWithVariants } from '../utils/pick-product';

test.describe('Cart - Happy Path', () => {

  test('adding a plain product from the listing reaches the cart correctly @smoke', async ({ page }) => {
    const productA = pickInStockProduct();
    if (!productA) throw new Error('Test data: expected at least one in-stock product');

    const titleA = productA.displayNameHe || productA.name;

    const productIndexPage = new ProductIndexPage(page);
    const cartPage = new CartPage(page);

    await productIndexPage.gotoSearch(titleA);
    await productIndexPage.addProductToCart(titleA);

    await cartPage.goto();
    await expect(cartPage.heading).toBeVisible();
    await expect(cartPage.item(titleA)).toBeVisible();
    await expect(cartPage.itemQuantity(titleA)).toHaveText('1');
  });

  test('🐛 KNOWN BUG (BUG-001): adding a configured product (variant + quantity) from PDP reaches the cart correctly @regression', async ({ page }) => {
    // BUG-001: quantity selected on the PDP is never applied to the cart —
    // AddToCartBtn hardcodes quantity to 1 and ProductDetails.jsx never
    // passes a quantity prop. See bugs/BUG-001-pdp-quantity-not-applied.md.
    // Remove this line once the bug is fixed; if the fix is correct the
    // test will then pass normally instead of being reported as expected-fail.
    test.fail(true, 'BUG-001: PDP quantity is not applied when adding to cart');

    const productB = pickProductWithVariants();
    if (!productB) throw new Error('Test data: expected at least one product with variants');

    const variants = productB.variants;
    if (!variants?.length) throw new Error('Test data: expected productB to have variants');

    const titleB = productB.displayNameHe || productB.name;
    const targetVariant = variants[0];

    const productDetailsPage = new ProductDetailsPage(page);
    const cartPage = new CartPage(page);

    await productDetailsPage.goto(productB.id);
    if (targetVariant.size) await productDetailsPage.selectSize(targetVariant.size);
    if (targetVariant.colorHe) await productDetailsPage.selectColor(targetVariant.colorHe);
    await productDetailsPage.increaseQuantity(1); // 1 -> 2
    await expect(productDetailsPage.quantityValue).toHaveText('2');
    await productDetailsPage.addToCart();

    await cartPage.goto();
    await expect(cartPage.item(titleB)).toBeVisible();
    if (targetVariant.size) {
      await expect(cartPage.itemVariantText(titleB)).toContainText(targetVariant.size);
    }
    // This is the assertion BUG-001 breaks — cart shows "1" instead of "2".
    await expect(cartPage.itemQuantity(titleB)).toHaveText('2');
  });
});