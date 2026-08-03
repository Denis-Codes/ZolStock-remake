import { test, expect } from '@playwright/test';
import { CATALOGUE_VERSION } from '../../src/services/storage-keys';

/*
 * Regression cover for stale persisted state after a catalogue change.
 *
 * The cart, wishlist and recently-viewed list survive a page load on purpose,
 * and all three key off product ids. When the eight real departments replaced
 * the invented five, ids changed meaning: the old catalogue banded them
 * p1001-p5004, the new one runs p1001-p1040.
 *
 * The reported symptom was a favourites badge stuck on 12 while the wishlist
 * page showed its empty state — the badge counts stored ids, the page only
 * renders ids that still resolve.
 *
 * These seed localStorage the way a returning visitor's browser would have it,
 * so they fail against the un-reconciled build rather than passing vacuously.
 */

// A wishlist as it would have been saved against the previous catalogue:
// some ids from bands that no longer exist at all, some from p1xxx which now
// resolve to a completely different product.
const OLD_WISHLIST = [
  'p1001', 'p1002', 'p1003',           // now housewares, were furniture
  'p2001', 'p2002', 'p2003',           // clothing — band no longer exists
  'p3001', 'p3002',                    // electronics — gone
  'p4001', 'p4002',                    // kitchen — gone
  'p5001', 'p5002',                    // pets — gone
];

const OLD_CART = [
  {
    variantKey: 'p2001-M-white',
    productId: 'p2001',
    name: 'טי-שירט בייסיק',
    price: 39.9,
    originalPrice: 59.9,
    image: 'assets/img/products/tshirt.png',
    quantity: 2,
    variant: { size: 'M', color: 'white', colorHe: 'לבן' },
    maxStock: 15,
  },
];

test.describe('Stale catalogue state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([wishlist, cart]) => {
        localStorage.setItem('zolstock_wishlist', JSON.stringify(wishlist));
        localStorage.setItem('zolstock_cart', JSON.stringify(cart));
        localStorage.setItem('zolstock_recently_viewed', JSON.stringify(['p5001', 'p3002']));
        // Deliberately no zolstock_catalogue_version — this is what a browser
        // carrying pre-change state actually looks like.
      },
      [OLD_WISHLIST, OLD_CART]
    );
  });

  test('a favourites badge from the previous catalogue does not survive a reload @regression', async ({ page }) => {
    await page.goto('/');

    // The bug: badge rendered "12" because it counts stored ids rather than
    // products that still resolve. It should not render at all now.
    await expect(page.locator('.wishlist-count')).toHaveCount(0);
  });

  test('a cart holding deleted products is not carried forward @regression', async ({ page }) => {
    await page.goto('/');

    // Cart rows store a name/price/image snapshot, so a stale row survives
    // even though its product is gone — and would reach checkout.
    await expect(page.locator('.cart-count')).toHaveCount(0);
  });

  test('state saved against the current catalogue is left alone @regression', async ({ page }) => {
    // Same seed, but stamped with the current catalogue version: nothing here
    // is stale, so the reconcile must not touch it. Guards against the fix
    // degenerating into "clear the wishlist on every boot".
    //
    // The stamp is read from the source rather than hard-coded — pinning it to
    // a literal made this test fail the moment CATALOGUE_VERSION was bumped,
    // reporting a stale fixture as a broken reconcile.
    await page.addInitScript((version) => {
      localStorage.setItem('zolstock_wishlist', JSON.stringify(['p1001', 'p1002']));
      localStorage.setItem('zolstock_catalogue_version', JSON.stringify(version));
    }, CATALOGUE_VERSION);

    await page.goto('/');

    await expect(page.locator('.wishlist-count')).toHaveText('2');
  });
});
