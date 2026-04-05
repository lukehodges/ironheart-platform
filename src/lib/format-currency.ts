const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
})

export function formatCurrency(amountInCents: number): string {
  return gbpFormatter.format(amountInCents / 100)
}

export function parseCurrencyInput(value: string): number {
  const stripped = value.replace(/[^0-9.]/g, "")
  const parsed = parseFloat(stripped)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}
