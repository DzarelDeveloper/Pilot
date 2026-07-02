import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli/index.tsx', 'src/agent/index.ts', 'src/memory/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  outDir: 'dist',
  dts: false,
  sourcemap: false,
  outExtension: () => ({ js: '.js' }),
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
  external: ['react', 'ink', 'ink-spinner', '@inkjs/ui', 'react-devtools-core', 'yoga-wasm-web'],
})
