export function StockWarning({ stockQty, inStock }) {
  if (!inStock || stockQty === 0) {
    return <span className="stock-warning out-of-stock">אזל מהמלאי</span>
  }

  if (stockQty <= 3) {
    return <span className="stock-warning low-stock">נותרו רק {stockQty}!</span>
  }

  return null
}
