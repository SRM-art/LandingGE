import {decimalScaled} from './pricing.ts';
export function isFloorByBox(product: {category_code?: string; presentation_code?: string}) {
  return product.category_code === 'pisos' && product.presentation_code === 'CAJA';
}
export function estimateFloor(area: string, waste: number, coverageScaled: number, priceCents: number | null) {
  const areaScaled = decimalScaled(area, 10000);
  if (areaScaled > 100000 * 10000) throw new Error('Para superficies mayores de 100.000 m², consulta con un asesor.');
  if (!Number.isInteger(waste) || waste < 0 || waste > 30) throw new Error('El excedente debe ser un porcentaje entero entre 0 y 30.');
  if (!Number.isSafeInteger(coverageScaled) || coverageScaled <= 0) throw new Error('No hay una cobertura válida por caja para calcular.');
  const numerator = BigInt(areaScaled) * BigInt(100 + waste);
  const denominator = BigInt(coverageScaled) * 100n;
  const boxes = (numerator + denominator - 1n) / denominator;
  const covered = boxes * BigInt(coverageScaled);
  if (covered > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('El resultado excede el rango permitido. Consulta con un asesor.');
  const total = Number.isSafeInteger(priceCents) && priceCents! > 0 ? boxes * BigInt(priceCents!) : null;
  return {
    areaScaled, waste, boxes: Number(boxes),
    requiredScaled: Number((numerator + 99n) / 100n),
    coveredScaled: Number(covered),
    totalCents: total !== null && total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : null,
  };
}
