export class CartPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'עגלת קניות' });
    this.itemCount = page.locator('.cart-item-count');
  }

  async goto() {
    await this.page.goto('/cart');
  }

  // Scopes to a single cart row by the product name text, since
  // variantKey (the React key) is never rendered in the DOM.
  item(productName) {
    return this.page.locator('article.cart-item').filter({ hasText: productName });
  }

  itemQuantity(productName) {
    return this.item(productName).locator('.item-quantity span');
  }

  itemVariantText(productName) {
    return this.item(productName).locator('.item-variant');
  }
}