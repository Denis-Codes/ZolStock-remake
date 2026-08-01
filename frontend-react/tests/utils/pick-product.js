import productsData from '../../src/data/products.json' with { type: 'json' };

// Shared across spec files so every test pulls real product data the same
// way, rather than each file re-implementing its own (and silently
// drifting apart over time).

export function pickInStockProduct(excludeIds = []) {
  return productsData.find((p) => p.inStock && !excludeIds.includes(p.id));
}

export function pickProductWithVariants(excludeIds = []) {
  return productsData.find((p) => (p.variants?.length ?? 0) > 0 && !excludeIds.includes(p.id));
}