# ClaudeConnect

Control Claude Code from Slack. Approve permissions, see output, and reply — all without touching VSCode.

![ClaudeConnect Demo](https://img.shields.io/badge/platform-Windows-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

## What It Does

ClaudeConnect is a bridge between **Claude Code** (running in VSCode) and **Slack**. It uses Claude Code's hook system to forward events to a Slack channel, and injects your Slack replies back into VSCode.

### Features

- **Permission Control** — Allow or Deny tool executions from Slack with one click
- **Live Output** — See everything Claude says, forwarded to your Slack channel in real-time
- **Reply from Slack** — Respond to Claude via a Reply button (modal) or the `/cc` slash command
- **Three Modes** — Switch between Ask Before Edits, Auto-Approve, and Plan Only from Slack
- **Works Across Projects** — Hooks are global, so any Claude Code session routes through Slack
- **Auto-Start** — Optional Windows startup script so the bridge runs automatically

### How It Works

```
Claude Code (VSCode)
    │
    ├─ PermissionRequest hook ──► Bridge Server ──► Slack (Allow/Deny buttons)
    ├─ Stop hook ────────────────► Bridge Server ──► Slack (output + Reply button)
    └─ Notification hook ────────► Bridge Server ──► Slack (alerts)

Slack reply ──► Bridge Server ──► PowerShell keyboard injection ──► VSCode input
```

1. Claude Code fires HTTP hooks to a local bridge server (`localhost:3456`)
2. The bridge formats messages and posts them to your Slack channel via Socket Mode
3. You interact with buttons, modals, or `/cc` commands in Slack
4. For permissions: the bridge responds directly to the hook's HTTP connection
5. For text replies: the bridge uses PowerShell to paste your reply into VSCode and press Enter

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Claude Code** running in VSCode
- **Slack workspace** where you can create apps
- **Windows** (keyboard injection uses PowerShell)

### 1. Clone and Install

```bash
git clone https://github.com/sudhanshudotel/ClaudeConnect.git
cd ClaudeConnect
npm install
```

### 2. Set Up Slack App

Follow the step-by-step guide: **[Slack App Setup](docs/slack-app-setup.md)**

This walks you through creating the Slack app, configuring permissions, and getting your tokens.

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your tokens:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CHANNEL_ID=C0123456789
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

You should see the Control Panel appear in your Slack channel.

## Usage

### From Slack

| Action | How |
|--------|-----|
| Approve a tool | Click **Allow** on the permission message |
| Deny a tool | Click **Deny** on the permission message |
| Reply to Claude | Click **Reply to Claude** button, type in the modal |
| Quick reply | Type `/cc your message here` |
| Switch to Ask mode | Click the mode button or type `/cc ask` |
| Switch to Auto mode | Click the mode button or type `/cc auto` |
| Switch to Plan mode | Click the mode button or type `/cc plan` |

### Modes

- **Ask Before Edits** — Every tool use requires your approval via Slack. Default mode.
- **Auto-Approve** — Tools execute immediately. Actions are logged to Slack for visibility.
- **Plan Only** — All tools are denied. Claude describes what it would do without executing.

## Project Structure

```
ClaudeConnect/
├── src/
│   ├── index.ts            # Entry point
│   ├── config.ts           # Environment config
│   ├── bridge-server.ts    # Express server receiving Claude Code hooks
│   ├── slack-app.ts        # Slack Bot (Socket Mode) handlers
│   ├── inject-input.ts     # PowerShell keyboard injection for replies
│   ├── formatters.ts       # Slack Block Kit message formatting
│   ├── types.ts            # TypeScript interfaces
│   ├── mode-manager.ts     # Operating mode state
│   └── pending-requests.ts # Async request tracking for permissions
├── claude-hooks/
│   └── settings-snippet.json  # Hook config to merge into Claude Code settings
├── docs/
│   └── slack-app-setup.md     # Step-by-step Slack app setup guide
├── .env.example               # Environment template
└── package.json
```

## Limitations

- **Windows only** — The reply injection uses PowerShell and Windows APIs. macOS/Linux would need a different injection method.
- **VSCode must be open** — Replies are injected via keyboard simulation, so VSCode needs to be running and accessible.
- **Single session** — The bridge serves one Claude Code session at a time.

## License

MIT
