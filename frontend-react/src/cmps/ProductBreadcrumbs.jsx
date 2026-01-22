import { NavLink } from 'react-router-dom'

export function ProductBreadcrumbs({ categorySlug, subCategorySlug, catLabel, subLabel }) {
  return (
    <nav className="breadcrumbs" aria-label="פירורי לחם">
      <ol className="crumbs">
        <li className="crumb">
          <NavLink to="/">עמוד הבית</NavLink>
        </li>

        {!!categorySlug && (
          <li className="crumb">
            <NavLink to={`/category/${categorySlug}`}>
              {catLabel || categorySlug}
            </NavLink>
          </li>
        )}

        {!!subCategorySlug && !!categorySlug && (
          <li className="crumb">
            <NavLink to={`/category/${categorySlug}/${subCategorySlug}`}>
              {subLabel || subCategorySlug}
            </NavLink>
          </li>
        )}
      </ol>
    </nav>
  )
}
