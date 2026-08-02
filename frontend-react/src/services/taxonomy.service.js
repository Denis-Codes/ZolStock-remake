/**
 * The single source of truth for the store's departments.
 *
 * This list was previously copy-pasted into five components — AppHeader,
 * HamburgerMenu, AppFooter, AboutUs and HomePage — each with its own slug and
 * Hebrew label. Changing the catalogue meant editing five files and hoping
 * none drifted. Everything reads from here now.
 *
 * These eight are the real ZolStock chain's departments. They replaced an
 * invented five (furniture / clothing / electronics / kitchen / pets) that
 * never matched the actual shop; the product catalogue was rebuilt with them.
 *
 * Order is deliberate: it is the order departments appear in the nav, the
 * homepage tiles, the drawer and the footer, so they always agree. It follows
 * the chain's own ordering.
 *
 * SUBCATEGORIES ARE NOT LISTED HERE. They are derived from the products
 * themselves by `buildCategorySubcats` in util.service.js, so a new
 * subcategory appears simply by existing in the data.
 */
export const DEPARTMENTS = [
    { slug: 'housewares', labelHe: 'כלי בית' },
    { slug: 'gifts', labelHe: 'מתנות' },
    { slug: 'textiles', labelHe: 'טקסטיל' },
    { slug: 'crafts', labelHe: 'יצירה' },
    { slug: 'cleaning', labelHe: 'נקיון' },
    { slug: 'baking', labelHe: 'אפייה' },
    { slug: 'toys', labelHe: 'צעצועים' },
    { slug: 'tools', labelHe: 'כלי עבודה' },
]

/** Route for a department's listing page. */
export function departmentPath(slug) {
    return `/category/${slug}`
}

/** Route for a subcategory listing inside a department. */
export function subcategoryPath(slug, subSlug) {
    return `${departmentPath(slug)}/${subSlug}`
}

/** Hebrew label for a slug, falling back to the slug so nothing renders blank. */
export function departmentLabel(slug) {
    return DEPARTMENTS.find(d => d.slug === slug)?.labelHe || slug
}
