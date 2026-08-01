export class ProductDetailsPage {
  constructor(page) {
    this.page = page;
    this.title = page.locator('.pd-title');
    // Scoped to .pd-actions — without this, it also matches every "add to
    // cart" button in the page's own "similar products" section below,
    // which share the exact same accessible name.
    this.addToCartBtn = page.locator('.pd-actions').getByRole('button', { name: 'הוסף לעגלה' });
    this.quantityValue = page.locator('.quantity-value');

    // Scoped to .pd-quantity since "+"/"-" are generic labels that
    // could theoretically collide with other controls on the page.
    this.increaseQtyBtn = page.locator('.pd-quantity').getByRole('button', { name: '+' });
    this.decreaseQtyBtn = page.locator('.pd-quantity').getByRole('button', { name: '-' });
  }

  async goto(productId) {
    await this.page.goto(`/product/${productId}`);
  }

  // Size buttons render the size value as their visible text.
  sizeOption(size) {
    return this.page.getByRole('button', { name: size, exact: true });
  }

  // Color buttons have no visible text (just a swatch span), so the
  // accessible name falls back to the `title` attribute (Hebrew color name).
  colorOption(colorHe) {
    return this.page.getByRole('button', { name: colorHe });
  }

  async selectSize(size) {
    await this.sizeOption(size).click();
  }

  async selectColor(colorHe) {
    await this.colorOption(colorHe).click();
  }

  async increaseQuantity(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.increaseQtyBtn.click();
    }
  }

  async addToCart() {
    await this.addToCartBtn.click();
  }
}