import { test, expect } from '@playwright/test';
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

  test('adding a configured product (variant + quantity) from PDP reaches the cart correctly @regression', async ({ page }) => {
    // Was BUG-001 (fixed): AddToCartBtn hardcoded quantity to 1 and
    // ProductDetails had no quantity prop to pass into, so the stepper drove
    // local display only. AddToCartBtn now takes `quantity` (defaulting to 1
    // for the call sites with no stepper) and dispatches it.
    //
    // The test.fail() marker is gone rather than the test — this is now the
    // permanent guard on the fixed behaviour.
    // See bugs/BUG-001-pdp-quantity-not-applied.md.
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
    // The assertion BUG-001 used to break — it showed "1".
    await expect(cartPage.itemQuantity(titleB)).toHaveText('2');
  });
});