/** Display grouping is separate from the plain decimal string sent to the API. */
export function plainCopInput(display: string): string {
  return display.replace(/[$\s.]/g, '').replace(',', '.');
}
export function formatCopInput(display: string): string {
  const cleaned = display.replace(/[^0-9,]/g, '');
  const [whole = '', ...fraction] = cleaned.split(',');
  const digits = whole.replace(/^0+(?=\d)/, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '$ ' + grouped + (fraction.length ? ',' + fraction.join('').slice(0, 2) : '');
}
