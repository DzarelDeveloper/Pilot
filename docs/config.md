# Configuration

Pilot stores all of its configuration locally on your machine. We value privacy and transparency.

## Config Location

The configuration file is located at `~/.pilot/config.json`.

```json
{
  "apiKeys": {
    "google": "AIzaSy...",
    "openrouter": "sk-or-v1-..."
  },
  "providerPriority": ["google", "openrouter", "ollama"]
}
```

## Environment Variables

You can override API keys using environment variables. This is useful for CI/CD environments.

| Provider | Environment Variable |
|----------|----------------------|
| Google Gemini | `GEMINI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Cloudflare AI | `CLOUDFLARE_API_KEY` & `CLOUDFLARE_ACCOUNT_ID` |

## Project Memory

Pilot remembers the context of your projects. Project memory is stored in:
`~/.pilot/projects/{hash}.json`

This file contains the detected tech stack, coding conventions, and architectural notes.
