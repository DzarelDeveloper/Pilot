# FAQ & Troubleshooting

## All Providers Failed

**Error Message:**
> Semua provider tidak tersedia. Tidak ada satupun AI provider yang terkonfigurasi.

**Solution:**
You need to configure at least one API key or ensure Ollama is running. Type `/setup` in the interactive `pilot` shell to add a key.

## Rate Limit Reached

**Error Message:**
> 429 Rate limit exceeded

**Solution:**
Pilot automatically routes around rate limits by switching to the next configured provider. If *all* your providers are rate limited, you will see an error. We recommend setting up at least 3 providers to avoid interruptions, or using Ollama as a fallback.

## Plugin Failed to Load

**Error Message:**
> Plugin folder missing plugin.json

**Solution:**
Ensure your plugin directory has a valid `plugin.json` at the root, containing `name`, `version`, `entry`, and `type`.

## Re-running Setup

If you want to clear all your keys and start from scratch, you can either:
1. Run `/setup` from inside the `pilot` shell.
2. Delete the `~/.pilot/config.json` file manually.
