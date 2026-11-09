export function money(cents: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}
export function equivalent(priceCents: number, quantityScaled: number) {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isSafeInteger(quantityScaled) || quantityScaled <= 0) return null;
  const numerator = BigInt(priceCents) * 10000n;
  const result=(numerator + BigInt(quantityScaled) / 2n) / BigInt(quantityScaled);
  return result>BigInt(Number.MAX_SAFE_INTEGER)?null:Number(result);
}
export function decimalScaled(value: unknown, scale: number) {
  const text = String(value ?? '').trim().replace(',', '.');
  const digits = Math.log10(scale);
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`).test(text)) throw new Error('Escribe un número positivo, sin separadores de miles.');
  const [a,b=''] = text.split('.');
  const n = BigInt(a)*BigInt(scale)+BigInt(b.padEnd(digits,'0'));
  if(n > BigInt(Number.MAX_SAFE_INTEGER) || n <= 0n) throw new Error('El valor debe ser mayor que cero y estar dentro del rango permitido.');
  return Number(n);
}
export function quantity(value: number) { return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 }).format(value/10000); }
export function slugify(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

