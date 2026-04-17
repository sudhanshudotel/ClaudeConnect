# ClaudeConnect

Control Claude Code from Telegram. Approve permissions, see output, and reply — all without touching VSCode.

![ClaudeConnect Demo](https://img.shields.io/badge/platform-Windows-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

## What It Does

ClaudeConnect is a bridge between **Claude Code** (running in VSCode) and **Telegram**. It uses Claude Code's hook system to forward events to a Telegram chat, and injects your Telegram replies back into VSCode.

### Features

- **Permission Control** — Allow or Deny tool executions from Telegram with one click
- **Live Output** — See everything Claude says, forwarded to your Telegram chat in real-time
- **Reply from Telegram** — Respond to Claude via a direct reply or the `/cc` command
- **Works Across Projects** — Hooks are global, so any Claude Code session routes through Telegram

### How It Works

```
Claude Code (VSCode)
    │
    ├─ PermissionRequest hook ──► Bridge Server ──► Telegram (Allow/Deny buttons)
    ├─ Stop hook ────────────────► Bridge Server ──► Telegram (output + prompt for reply)
    └─ Notification hook ────────► Bridge Server ──► Telegram (alerts)

Telegram reply ──► Bridge Server ──► PowerShell keyboard injection ──► VSCode input
```

1. Claude Code fires HTTP hooks to a local bridge server (`localhost:3456`)
2. The bridge formats messages and sends them to your Telegram chat using a Bot
3. You interact with inline buttons, reply directly, or use `/cc` commands in Telegram
4. For permissions: the bridge responds directly to the hook's HTTP connection
5. For text replies: the bridge uses PowerShell to paste your reply into VSCode and press Enter

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Claude Code** running in VSCode
- **Telegram account** to create and use the bot
- **Windows** (keyboard injection uses PowerShell)

### 1. Clone and Install

```bash
git clone https://github.com/sudhanshudotel/ClaudeConnect.git
cd ClaudeConnect
npm install
```

### 2. Set Up Telegram Bot

Follow the step-by-step guide: **[Telegram Bot Setup](docs/telegram-bot-setup.md)**

This walks you through creating the Telegram bot, configuring it, and getting your token and chat ID.

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your tokens:

```
TELEGRAM_BOT_TOKEN=1234567890:AbCDefGhIJKLmnopQRstUVwxyZ
TELEGRAM_CHAT_ID=123456789
```

### 4. Configure Claude Code Hooks

Add the hooks from `claude-hooks/settings-snippet.json` to your global Claude Code settings:

**Windows:** `C:\Users\<you>\.claude\settings.json`
**macOS/Linux:** `~/.claude/settings.json`

Merge the `hooks` object into your existing settings. Then restart Claude Code.

### 5. Start the Bridge

```bash
npm run dev
```

You should see the Control Panel appear in your Telegram chat.

## Usage

### From Telegram

| Action | How |
|--------|-----|
| Approve a tool | Click **✅ Allow** on the permission message |
| Deny a tool | Click **❌ Deny** on the permission message |
| Reply to Claude | Send a message to the bot or reply directly to the bot's messages |
| Quick reply | Type `/cc your message here` |

### Modes

Modes are controlled from **VSCode** (not Telegram). Use Claude Code's built-in permission modes:

- **Ask Before Edits** — Tool uses fire a PermissionRequest hook, and you approve/deny from Telegram.
- **Edit Automatically** — Tools execute immediately. Output is still logged to Telegram.
- **Plan Only** — Claude only describes what it would do.

## Project Structure

```
ClaudeConnect/
├── src/
│   ├── index.ts            # Entry point
│   ├── config.ts           # Environment config
│   ├── bridge-server.ts    # Express server receiving Claude Code hooks
│   ├── telegram-app.ts     # Telegram Bot integration
│   ├── inject-input.ts     # PowerShell keyboard injection for replies
│   ├── formatters.ts       # Telegram HTML formatting and markups
│   ├── types.ts            # TypeScript interfaces
│   └── pending-requests.ts # Async request tracking for permissions
├── claude-hooks/
│   └── settings-snippet.json  # Hook config to merge into Claude Code settings
├── docs/
│   └── telegram-bot-setup.md  # Step-by-step Telegram bot setup guide
├── .env.example               # Environment template
└── package.json
```

## Limitations

- **Windows only** — The reply injection uses PowerShell and Windows APIs. macOS/Linux would need a different injection method.
- **VSCode must be open** — Replies are injected via keyboard simulation, so VSCode needs to be running and accessible.
- **Single session** — The bridge serves one Claude Code session at a time.

## License

MIT
