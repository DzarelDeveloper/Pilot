export type Intent = 'code' | 'chat'

/**
 * Deteksi intent dari input user — TANPA API call, harus instant.
 * Jika ambigu → default ke "chat" (lebih aman).
 */
export function detectIntent(input: string): Intent {
  const lower = input.toLowerCase().trim()

  // CHAT yang pasti — cek dulu sebelum coding check
  const definiteChat = [
    /^(apa|apakah|bagaimana|kenapa|mengapa|kapan|dimana|siapa)/,
    /^(what|how|why|when|where|who|explain|tell me|describe)/,
    /^(halo|hai|hello|hi|thanks|terima kasih|ok|oke)/,
    /\?([\s]*)$/,  // kalimat yang diakhiri tanda tanya
  ]
  if (definiteChat.some(pattern => pattern.test(lower))) return 'chat'

  // CODING yang pasti — action verb DI AWAL kalimat atau diikuti nama file/path
  const definiteCode = [
    /^(buat|bikin|create|generate|tambah|add)\s+(file|folder|function|class|komponen|component|api|endpoint|route|model|schema|test|script)/,
    /^(edit|ubah|update|fix|perbaiki|refactor|rename|hapus|delete|remove)\s+\S+\.(ts|js|tsx|jsx|py|go|rs|java|css|html|json|md)/,
    /^(implementasi|implement|setup|install|migrate|init)\s/,
    /\.(ts|js|tsx|jsx|py|go|rs)\s+(di|pada|in|at|untuk)/,
  ]
  if (definiteCode.some(pattern => pattern.test(lower))) return 'code'

  // Default ke chat jika tidak ada sinyal koding yang jelas
  return 'chat'
}
