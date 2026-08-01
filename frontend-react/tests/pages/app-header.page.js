export class AppHeaderPage {
  constructor(page) {
    this.page = page;
    this.hamburgerBtn = page.getByRole('button', { name: 'פתח תפריט' });
    this.closeBtn = page.getByRole('button', { name: 'סגור תפריט' });
    // The drawer's aria-label ("תפריט") makes it directly findable as a
    // dialog role — no need to reach for a class selector.
    this.drawer = page.getByRole('dialog', { name: 'תפריט' });
  }

  async openMenu() {
    await this.hamburgerBtn.click();
  }

  async closeMenu() {
    await this.closeBtn.click();
  }

  // Category links inside the drawer render as plain NavLinks (the
  // component only takes its button-based branch when an onPickSubcat
  // prop is passed, which AppHeader.jsx never does).
  categoryLink(labelHe) {
    return this.drawer.getByRole('link', { name: labelHe, exact: true });
  }

  async navigateToCategory(labelHe) {
    await this.categoryLink(labelHe).click();
  }
}