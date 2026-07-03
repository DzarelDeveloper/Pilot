# Plugin Development

Pilot supports custom AI providers and commands via a simple plugin system. This is useful for integrating internal company LLMs or creating custom workflows.

## Plugin Structure

A plugin is simply a directory with a `plugin.json` manifest and an entry file (e.g., `index.js`).

```json
{
  "name": "my-custom-provider",
  "version": "1.0.0",
  "entry": "index.js",
  "type": "provider"
}
```

## Provider Interface

For a provider plugin, your `entry` file must export a `complete` function:

```javascript
// index.js
export async function complete(request) {
  // request.messages contains the conversation history
  
  // Call your custom AI API here
  const response = await fetch('http://localhost:8080/v1/chat', { ... })
  const data = await response.json()

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage.total_tokens
  }
}
```

## Installing Your Plugin

Once your plugin directory is ready, you can install it locally:

```bash
pilot plugin add ./my-custom-provider
```

Pilot will copy it to `~/.pilot/plugins/` and it will automatically be loaded in the fallback router loop.
