export class HomePage {
    constructor(page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.map = page.getByTestId('branch-map');
        this.branchAccordion = page.getByTestId('branch-accordion');
        this.scrollToTopButton = page.getByRole('button', { name: 'חזרה לראש הדף' });
    }

    async goto() {
        await this.page.goto('/');
    }
}