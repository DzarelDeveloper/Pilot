# Commands Reference

Pilot features several specialized subcommands for quick development tasks.

## `pilot explain`

Explains a file's content without needing to open it in an editor.

**Usage:**
```bash
pilot explain <path> [--lang id|en] [--lines start-end] [--deep]
```

**Examples:**
```bash
pilot explain src/utils/parser.js --lang id
pilot explain package.json --lines 10-50 --deep
```

## `pilot fix`

Analyzes an error message and suggests step-by-step fixes. Automatically detects your tech stack (Node.js, Python, Go, etc.) for better context.

**Usage:**
```bash
pilot fix "<error message>" [--file path/to/context] [--apply]
```

**Examples:**
```bash
pilot fix "Cannot find module 'chalk'" --file src/index.ts
```
*(Note: `--apply` is a stub for auto-fixing in v1.0.0 and will be fully implemented in v1.1.0).*

## `pilot plugin`

Manage custom plugins for Pilot.

**Usage:**
```bash
pilot plugin list
pilot plugin add <path>
pilot plugin remove <name>
```

**Examples:**
```bash
pilot plugin list
pilot plugin add ./my-custom-provider
```
