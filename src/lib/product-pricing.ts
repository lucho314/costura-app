export function roundSuggestedPrice(n: number) {
  const hasDecimals = n % 1 !== 0
  const step = hasDecimals ? 50 : 10

  return Math.ceil(n / step) * step
}
