/**
 * Estimasi token berdasarkan jumlah karakter.
 * 1 token ≈ 4 karakter.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
