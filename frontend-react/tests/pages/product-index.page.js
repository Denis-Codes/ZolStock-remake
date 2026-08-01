export class ProductIndexPage {
  constructor(page) {
    this.page = page;
  }

  async gotoCategory(categorySlug) {
    await this.page.goto(`/category/${categorySlug}`);
  }

  // Reaches the same product-card markup via search instead of category
  // navigation — avoids depending on the product's `category` field
  // actually matching a real route slug, which isn't guaranteed.
  async gotoSearch(query) {
    await this.page.goto(`/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Scopes to a single product card by its title text.
   * Cards share no data-testid, so this is the most reliable
   * way to target one product among many on the listing.
   */
  card(productTitle) {
    return this.page.locator('article.product-card').filter({ hasText: productTitle });
  }

  productLink(productTitle) {
    return this.card(productTitle).getByRole('link', { name: productTitle });
  }

  // "הוסף לעגלה" is identical across every card, so this must stay
  // scoped through .card() rather than queried on the page directly.
  addToCartBtn(productTitle) {
    return this.card(productTitle).getByRole('button', { name: 'הוסף לעגלה' });
  }

  async addProductToCart(productTitle) {
    await this.addToCartBtn(productTitle).click();
  }

  async openProduct(productTitle) {
    await this.productLink(productTitle).click();
  }
}