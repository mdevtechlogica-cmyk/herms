export function calculateTax(taxableAmount: number, taxRate: number): number {
  return Math.round(taxableAmount * taxRate * 100) / 100;
}

export function formatTaxLabel(taxName: string, taxRate: number): string {
  return `${taxName} (${Math.round(taxRate * 100)}%)`;
}
