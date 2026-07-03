# Changelog

Semua perubahan penting dalam proyek ini akan didokumentasikan di file ini.
Format yang digunakan berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-03
### Added
- **Stable Release**: First stable release of Pilot!
- **Test Coverage**: Added Vitest coverage tracking with a minimum threshold of 60%.
- **Documentation Site**: Launched official VitePress documentation site.
- **CI/CD**: Added GitHub Actions workflows for automated testing, documentation deployment, and npm publishing with provenance.

## [0.3.0] - 2026-07-02
### Added
- **`pilot explain` command**: Explain the contents of any file with chunking for large files.
- **`pilot fix` command**: Paste an error message to get AI-powered diagnosis and step-by-step fix suggestions with automatic tech stack detection.
- **Plugin System**: Create custom AI providers and commands. Added `pilot plugin list/add/remove` commands.

## [0.2.0] - 2026-07-02
### Added
- **Project Memory**: Sistem baru untuk membaca, mengingat *tech stack*, serta konvensi penulisan kode pada proyek (caching 24 jam) dan menerapkannya pada *system prompt*.
- **Token Compression**: Sistem 2-level (*Trim* dan AI *Summarize*) untuk mengelola batas *context window*, dieksekusi secara otomatis sebelum permintaan dikirim ke *provider*.
- **One-Shot Mode (`pilot "prompt"`)**: Mode eksekusi CLI yang lebih cepat (tanpa UI interaktif penuh), menerapkan auto-approve dan lazy loading dependensi sehingga *startup* berjalan < 2 detik.
- **Better Diff View**: UI diff khusus bawaan yang merender *chunks* kode beserta konteksnya secara indah (bergaya Git) dan menampilkan ringkasan jumlah baris ditambah/dihapus.

### Changed
- Refactor `detectIntent` (tidak lagi menggunakan API call, kini regex parsing secara instan).
- Refactor `think` phase untuk meminimalisasi *scanning* berulang berkat adanya Project Memory.
- Peningkatan performa pada eksekusi aplikasi menggunakan *dynamic imports* pada CLI `index.tsx`.

## [0.1.0] - Initial Release
### Added
- Multi-provider smart router dengan 9 AI provider (Google Gemini, Qwen, NVIDIA NIM, OpenRouter, Cloudflare AI, Kiro AI, iFlow, OpenCode, Ollama).
- Mekanisme *auto-switch fallback* saat provider *rate-limited* atau *down*.
- *Persistent memory* untuk menyimpan riwayat percakapan secara terenkripsi/lokal per proyek.
- Ollama auto-detection dan seamless fallback untuk *offline inference*.
- Vibe Coding agent loop: *Think*, *Plan*, *Approve*, *Execute*, *Summary*.
- Antarmuka *Beautiful Terminal UI* dengan `ink` (React untuk CLI).
