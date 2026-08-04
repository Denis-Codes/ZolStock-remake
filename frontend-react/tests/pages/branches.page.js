export class BranchesPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'הסניפים שלנו', level: 1 });
    this.map = page.getByTestId('branch-map');
    this.accordion = page.getByTestId('branch-accordion');

    // Only the region summaries carry aria-expanded — the 74 branch rows
    // inside the open panel are buttons too, but they expose aria-pressed.
    this.regionToggles = this.accordion.locator('[aria-expanded]');
    this.branchRows = this.accordion.locator('.branch-row');
  }

  async goto() {
    await this.page.goto('/branches');
  }

  async expandFirstRegion() {
    await this.regionToggles.first().click();
  }
}
