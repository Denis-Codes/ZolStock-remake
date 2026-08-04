export class HomePage {
    constructor(page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.scrollToTopButton = page.getByRole('button', { name: 'חזרה לראש הדף' });

        // The homepage's own blocks. The branch map and the branch accordion
        // used to live here too; they are on /branches now — see
        // tests/pages/branches.page.js.
        this.dealsHeading = page.getByRole('heading', { name: 'המבצעים הגדולים' });
        this.dealCards = page.locator('article.product-card');
        this.categoryTiles = page.getByRole('navigation', { name: 'מחלקות החנות' });
        this.branchesCta = page.getByRole('link', { name: 'למצוא סניף קרוב' });
    }

    async goto() {
        await this.page.goto('/');
    }

    categoryTile(labelHe) {
        return this.categoryTiles.getByRole('link', { name: labelHe, exact: true });
    }

    async openBranches() {
        await this.branchesCta.click();
    }
}
