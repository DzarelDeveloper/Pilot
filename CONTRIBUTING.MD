# CONTRIBUTING.md — Development Guide

## Setup Development

```bash
# Clone
git clone https://github.com/DzarelDeveloper/pilot
cd pilot

# Install dependencies
pnpm install

# Build
pnpm build

# Link ke global (biar bisa jalankan `pilot` langsung)
pnpm link --global

# Test
pilot init
pilot status
```

---

## Dev Mode (watch)

```bash
pnpm dev
# TypeScript watch mode — auto-compile saat ada perubahan
```

---

## Folder Penting untuk Kontributor

| Folder | Apa yang dikerjakan |
|---|---|
| `src/router/providers/` | Tambah provider baru di sini |
| `src/cli/ui/` | Ubah tampilan CLI di sini |
| `src/agent/` | Logic think/plan/execute |
| `src/memory/` | Persistent storage |

---

## Cara Tambah Provider Baru

1. Buat file baru di `src/router/providers/namaProvider.ts`
2. Ikuti interface `ProviderConfig` di `src/router/providers/types.ts`
3. Export dari `src/router/providers/index.ts`
4. Tambah env key di `pilot init` (di `src/cli/commands/init.ts`)
5. Tambah dokumentasi di `PROVIDERS.md`

---

## Commit Convention

```
feat: tambah provider iFlow
fix: memory tidak tersimpan saat session pertama
ui: perbaiki alignment di PlanView
docs: update PROVIDERS.md
test: tambah test untuk router fallback
```

---

## Script

```bash
pnpm build       # compile TypeScript ke dist/
pnpm dev         # watch mode
pnpm test        # jalankan semua test
pnpm lint        # eslint
pnpm format      # prettier
pnpm clean       # hapus dist/
```