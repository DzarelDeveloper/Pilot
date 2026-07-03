# Getting Started

Pilot is an AI coding assistant designed to live in your terminal. It connects to 9 free AI providers and automatically routes your requests to the best available model, ensuring you never hit a context wall.

## Prerequisites

- Node.js v20+
- npm or pnpm

## Installation

Install Pilot globally via npm:

```bash
npm install -g pilot-ai-cli
```

## Setup & Authentication

Run `pilot` in your terminal for the first time. The CLI will guide you through an interactive setup process to configure your AI providers.

```bash
pilot
```

You only need to configure at least one provider to get started. We recommend setting up Google Gemini, Groq, or using Ollama for local execution.

## First Commands

Once set up, you can start vibe coding:

```bash
# Start an interactive session
pilot

# Or use one-shot mode
pilot "create a login page with React and Tailwind"
```
