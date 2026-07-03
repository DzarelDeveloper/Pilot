<div align="center">

<img src="./assets/banner.png" alt="Pilot Banner" />



<br/>

[![Status](https://img.shields.io/badge/Status-Active%20Development-22d3ee?style=for-the-badge&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-818cf8?style=for-the-badge)]()
[![Node](https://img.shields.io/badge/Node.js-20+-34d399?style=for-the-badge&logo=node.js&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3b82f6?style=for-the-badge&logo=typescript&logoColor=white)]()

</div>

---

> **⚠️ ACTIVE DEVELOPMENT** — Features, commands, dan konfigurasi dapat berubah sewaktu-waktu. Expect bugs and frequent updates!

---

## Apa itu Pilot?

Pilot adalah **CLI tool untuk vibe coding** yang menggabungkan 9 provider AI gratis ke dalam satu interface. Kamu cukup ketik `pilot`, dan Pilot yang urus selebihnya — routing ke model terbaik yang tersedia, auto-switch saat limit habis, dan menjaga memory conversation tetap utuh sepanjang session.

Pilot bukan chatbot. Pilot adalah **AI coding agent** — dia bisa membaca struktur project kamu, membuat plan, lalu mengeksekusi perubahan kode secara langsung ke file.

---

## Mengapa Pilot?

Semua provider AI gratis punya **daily limit**. Kalau habis di tengah sesi coding:

- 😤 Harus ganti model secara manual
- 💀 Context dan conversation hilang — mulai dari nol lagi
- ⏱️ Produktivitas terganggu

**Pilot menyelesaikan ini semua secara otomatis.**

| | Tanpa Pilot | Dengan Pilot |
|:---:|---|---|
| 🔀 | Ganti model manual saat limit habis | Auto-switch transparan |
| 🧠 | Context hilang saat ganti model | Memory tetap utuh 100% |
| ⚙️ | Setup ulang tiap provider | Satu kali setup, selamanya jalan |
| 📊 | Satu provider = satu limit | 9 provider = limit berlipat ganda |
| 🌐 | Tidak bisa offline | Ollama fallback — jalan tanpa internet |

---

## ✨ Fitur Utama

### 🔄 Smart Router — 9 Provider Gratis
Pilot secara otomatis memilih provider terbaik yang tersedia dan berpindah ke provider berikutnya saat limit habis — tanpa kamu perlu melakukan apapun.

### 🧠 Persistent Memory
Conversation history disimpan lokal dan di-inject ke provider baru saat terjadi auto-switch. Model berganti, context tidak pernah hilang.

### 🤖 Vibe Coding Agent
Ketik apa yang kamu mau buat dalam bahasa natural. Pilot akan:

1. **Think** — membaca dan memahami struktur project kamu
2. **Plan** — membuat daftar langkah yang konkret
3. **Approve** — menampilkan plan, menunggu konfirmasi kamu
4. **Execute** — membuat dan mengedit file satu per satu
5. **Summary** — menampilkan hasil lengkap

### ⬛ Ollama — Local AI Unlimited
Pilot terintegrasi penuh dengan Ollama untuk AI yang berjalan 100% di komputermu. Tidak butuh internet, tidak butuh API key, tidak ada limit. Pilot bisa install Ollama dan download model langsung dari dalam CLI.

### 🎨 Beautiful Terminal UI
Dibangun dengan `ink` (React untuk terminal) — ada spinner, progress bar, diff view, dan summary yang rapi. Bukan plain `console.log`.

---

## 🆕 What's New in v1.0.0 (Stable Release)

- **First stable release!** Pilot v1.0.0 is production-ready. Breaking changes will follow strict semantic versioning.
- **60%+ Test Coverage**: All core commands (`explain`, `fix`, `plugin`) and infrastructure modules are covered by automated tests.
- **Official Documentation Site**: Dedicated docs site built with VitePress — Getting Started, Commands Reference, Plugin Guide, Configuration, dan FAQ.
- **npm Distribution**: Install Pilot globally via `npm install -g pilot-ai-cli` untuk pengalaman terbaik.
- **CI/CD**: Automated testing, documentation deployment, and npm publishing via GitHub Actions with provenance.

---

## Previous Releases

<details>
<summary>v0.3.0 — Developer Experience</summary>

- **`pilot explain <file>`**: Penjelasan kode otomatis.
- **`pilot fix "<error>"`**: Diagnosis dan perbaikan error AI-powered.
- **Plugin System**: Custom provider dan command via plugin.

</details>

<details>
<summary>v0.2.0 — Smarter</summary>

- **Project Memory**: Pilot mempelajari tech stack proyekmu.
- **Smart Token Compression**: Auto-compress context panjang.
- **One-Shot Mode**: `pilot "prompt"` tanpa UI interaktif.
- **Better Diff View**: Tampilan diff bergaya Git.

</details>

---

## 🌐 9 Provider yang Didukung

| # | Provider | Model Terbaik | Free Limit |
|:---:|---|---|:---:|
| 1 | **Gemini** | Gemini 2.0 Flash | 1,500 req/hari |
| 2 | **Qwen** | Qwen 2.5 72B | Generous daily |
| 3 | **NVIDIA NIM** | Llama 3.1 70B | $25 free credit |
| 4 | **OpenRouter** | Mistral 7B, Llama | Free models |
| 5 | **Cloudflare AI** | Llama 3.1 8B | 10,000 req/hari |
| 6 | **Kiro AI** | — | Free tier |
| 7 | **iFlow** | — | Free tier |
| 8 | **OpenCode** | Code-focused | Free |
| 9 | **Ollama** ⬛ | llama3.2, phi3, qwen2.5-coder | **∞ Unlimited** |

> **💡 Tip:** Semakin banyak provider yang kamu setup, semakin panjang kamu bisa coding tanpa gangguan limit.

---

## 🔧 Cara Kerja

```
Kamu ketik sesuatu
       ↓
Smart Router cek provider yang tersedia (prioritas 1 → 9)
       ↓
Kirim ke provider terbaik dengan full conversation history
       ↓
Jika 429 / rate limit terdeteksi → switch ke provider berikutnya (transparan)
       ↓
Response sampai ke kamu — kamu tidak tahu ada perpindahan
       ↓
Memory diupdate di disk untuk session berikutnya
```

Untuk vibe coding, ada agent loop tambahan:

```
Prompt kamu
  → Think   : Pilot scan project, baca package.json dan src/
  → Plan    : Buat list langkah konkret dalam JSON
  → Approve : Tampilkan plan ke kamu, tunggu y/n/e
  → Execute : Buat / edit file, tampilkan diff sebelum apply
  → Summary : Tampilkan semua yang dikerjakan
```

---

## 🚀 Instalasi

### Prerequisites

- [Node.js](https://nodejs.org/) v20 ke atas
- `npm` atau `pnpm`

### Langkah-langkah

1. **Clone repository**
```bash
git clone https://github.com/Dzareldeveloper/Pilot.git
cd Pilot
```

2. **Install dependencies**
```bash
npm install
```

3. **Build project**
```bash
npm run build
```

4. **Link ke global** (supaya bisa jalankan "pilot" dari mana saja)
```bash
npm link
```

---

## 📖 Cara Menggunakan

### Pertama Kali

```bash
pilot
```

Pilot akan menampilkan banner, lalu memandu setup provider. Proses ini hanya dilakukan **sekali**.

```
  Setup Provider — pilih minimal 1 untuk mulai

  [1/8] Gemini (RECOMMENDED — 1500 req/hari)
        Ambil key: https://aistudio.google.com/apikey
        » Paste key (Enter skip): AIzaSy...

  [2/8] Qwen
        » Paste key (Enter skip):     ← Enter untuk skip

  ...

  ✓ 2 provider dikonfigurasi. Siap digunakan!
```

### Setelah Setup

Ketik apapun langsung di dalam Pilot:

```bash
» buat halaman login dengan React dan Tailwind
» tambah validasi email di form register
» jelaskan cara kerja JWT authentication
» fix error di src/auth/login.ts
```

Pilot otomatis mendeteksi apakah kamu sedang vibe coding atau sekadar bertanya, lalu menjalankan flow yang sesuai.

### Commands di Dalam Pilot

| Command | Fungsi |
|---|---|
| `/status` | Lihat status semua provider — aktif, kena limit, atau belum setup |
| `/setup` | Tambah atau update API key provider |
| `/new` | Mulai session baru, bersihkan history |
| `/help` | Tampilkan semua command yang tersedia |
| `/exit` | Keluar dari Pilot |

### Setup Ollama (Opsional tapi Direkomendasikan)

Saat setup, Pilot akan mendeteksi Ollama secara otomatis. Jika belum terinstall, Pilot bisa membantu proses install dan download model langsung dari CLI.

| Model | Size | Keunggulan |
|---|:---:|---|
| `llama3.2` | 2 GB | Recommended, general purpose |
| `qwen2.5-coder` | 4.7 GB | Terbaik untuk coding |
| `phi3` | 2.3 GB | Ringan dan cepat |
| `deepseek-r1` | 4.7 GB | Terbaik untuk reasoning |
| `mistral` | 4.1 GB | Balanced, fast |

---

## 🗂️ Struktur Data Lokal

Semua data disimpan **lokal di komputermu**. Pilot tidak mengirim apapun ke server pihak ketiga selain request ke provider AI yang kamu pilih sendiri.

```
~/.pilot/
├── config.json         ← API keys
├── sessions/
│   └── {hash}.json     ← conversation history per project
└── projects/
    └── {hash}.json     ← context project yang dipelajari Pilot
```

---

## 🗺️ Roadmap

### v0.1.0 — MVP CLI

- [x] Multi-provider smart router dengan auto-switch
- [x] Persistent memory — context tidak hilang saat model berganti
- [x] Ollama integration — local AI, offline, unlimited
- [x] Vibe coding agent: think → plan → approve → execute → summary
- [x] Beautiful terminal UI dengan ink
- [x] Unified onboarding flow — satu perintah `pilot`

### v0.2.0 — Smarter *(sekarang)*

- [x] Project memory — Pilot ingat tech stack dan conventions project kamu
- [x] Token compression untuk context window yang sangat panjang
- [x] `pilot "prompt"` one-shot mode tanpa masuk interactive
- [x] Better diff view dengan syntax highlighting

### v0.3.0 — Developer Experience *(sekarang)*

- [x] `pilot explain [file]` — jelaskan kode di file tertentu
- [x] `pilot fix "error message"` — paste error, Pilot langsung fix
- [x] Plugin system — tambah provider sendiri

### v0.4.0 — Developer Experience Part 2

- [ ] Implementasi auto-fix sungguhan dengan flag `--apply`
- [ ] Multi-file context otomatis untuk explain
- [ ] Plugin marketplace / registry publik

### v1.0.0 — Stable

- [ ] Test coverage 60%+
- [ ] Docs site
- [ ] npm publish → `npm install -g pilot-ai`

---

## 🤝 Contributing

Karena Pilot masih dalam tahap **aktif development**, kami sangat terbuka terhadap masukan, laporan bug, maupun Pull Request!

```bash
# Fork, lalu clone fork kamu
git clone https://github.com/username/Pilot.git

# Buat branch baru
git checkout -b feature/nama-fitur

# Commit
git commit -m "feat: deskripsi singkat"

# Push dan buka Pull Request
git push origin feature/nama-fitur
```

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap termasuk cara menambah provider baru.

---

## 📄 License

Didistribusikan di bawah lisensi MIT.

---

<div align="center">

**[⭐ Star project ini](https://github.com/Dzareldeveloper/Pilot)** jika kamu merasa ini berguna.

*Built for developers who just want to ship.*

</div>
