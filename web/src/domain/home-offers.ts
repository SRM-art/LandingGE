import {productPricing} from './pricing.ts';
type PricedProduct = {id: string; name: string; price_cents: number | null; discount_price_cents?: number};
/** Rank the current public catalog; never persist a duplicate list of offers. */
export function selectHomeOffers<T extends PricedProduct>(products: T[]): T[] {
  return products.filter(p => Number.isSafeInteger(p.price_cents) && p.price_cents! > 0)
    .map(p => ({product: p, pricing: productPricing(p)}))
    .sort((a, b) => {
      if (a.pricing.hasDiscount !== b.pricing.hasDiscount) return a.pricing.hasDiscount ? -1 : 1;
      if (a.pricing.hasDiscount) {
        // Compare exact savings ratios, without sorting on the rounded display percentage.
        const difference = BigInt(b.pricing.regular! - b.pricing.final!) * BigInt(a.pricing.regular!)
          - BigInt(a.pricing.regular! - a.pricing.final!) * BigInt(b.pricing.regular!);
        if (difference !== 0n) return difference > 0n ? 1 : -1;
      }
      return a.pricing.final! - b.pricing.final! || a.product.name.localeCompare(b.product.name, 'es')
        || a.product.id.localeCompare(b.product.id);
    }).slice(0, 8).map(item => item.product);
}
