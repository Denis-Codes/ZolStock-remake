import { NavLink } from 'react-router-dom'
import { departmentPath, subcategoryPath, departmentLabel } from '../services/taxonomy.service'

export function ProductBreadcrumbs({ categorySlug, subCategorySlug, catLabel, subLabel }) {
  return (
    <nav className="breadcrumbs" aria-label="פירורי לחם">
      <ol className="crumbs">
        <li className="crumb">
          <NavLink to="/">עמוד הבית</NavLink>
        </li>

        {!!categorySlug && (
          <li className="crumb">
            <NavLink to={departmentPath(categorySlug)}>
              {catLabel || departmentLabel(categorySlug)}
            </NavLink>
          </li>
        )}

        {!!subCategorySlug && !!categorySlug && (
          <li className="crumb">
            <NavLink to={subcategoryPath(categorySlug, subCategorySlug)}>
              {/* No central label source for subcategories — they're derived
                  from product data — so the slug stays the only fallback. */}
              {subLabel || subCategorySlug}
            </NavLink>
          </li>
        )}
      </ol>
    </nav>
  )
}
