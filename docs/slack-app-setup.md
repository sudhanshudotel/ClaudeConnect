# Slack App Setup Guide

Follow these steps to create the Slack app that ClaudeConnect uses.

---

## Step 1: Create the App

1. Go to **https://api.slack.com/apps**
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. App Name: `ClaudeConnect`
5. Pick your workspace
6. Click **"Create App"**

You'll land on the **Basic Information** page.

---

## Step 2: Enable Socket Mode

Socket Mode lets the app receive events via WebSocket (no public URL needed).

1. In the left sidebar, click **"Socket Mode"**
2. Toggle **"Enable Socket Mode"** to ON
3. You'll be prompted to create an **App-Level Token**:
   - Token Name: `claude-connect-socket`
   - Scopes: `connections:write` (should be pre-selected)
   - Click **"Generate"**
4. **Copy the token** (starts with `xapp-`) — this is your `SLACK_APP_TOKEN`

---

## Step 3: Set Up Bot Permissions

1. In the left sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Scopes" → "Bot Token Scopes"**
3. Add these scopes:
   - `chat:write` — Post messages
   - `chat:write.public` — Post to channels without being invited
   - `channels:read` — List channels
   - `channels:history` — Read messages in public channels
   - `groups:history` — Read messages in private channels

---

## Step 4: Install the App

1. Scroll to the top of the **"OAuth & Permissions"** page
2. Click **"Install to Workspace"** (or "Reinstall" if updating)
3. Review permissions and click **"Allow"**
4. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`) — this is your `SLACK_BOT_TOKEN`

---

## Step 5: Enable Interactivity

This lets the app receive button clicks (Allow/Deny, mode switches).

1. In the left sidebar, click **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to ON
3. You do NOT need to enter a Request URL (Socket Mode handles delivery)
4. Click **"Save Changes"**

---

## Step 6: Create the Slash Command

This lets you reply to Claude from Slack by typing `/cc your message`.

1. In the left sidebar, click **"Slash Commands"**
2. Click **"Create New Command"**
3. Fill in:
   - Command: `/cc`
   - Short Description: `Send a message to Claude Code`
   - Usage Hint: `your message to Claude`
4. Click **Save**

(No Request URL needed — Socket Mode handles delivery.)

---

## Step 7: Subscribe to Events

1. In the left sidebar, click **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. Under **"Subscribe to bot events"**, click **"Add Bot User Event"**
4. Add: `message.channels` and `message.groups` (for private channels)
5. Click **"Save Changes"**

---

## Step 8: Create the Channel

1. In Slack, create a new channel: **#claude-connect** (or any name you prefer)
2. Get the Channel ID:
   - Right-click the channel name
   - Click **"View channel details"**
   - Scroll to the bottom — the Channel ID looks like `C0ABC123DEF`
3. **Copy the Channel ID** — this is your `SLACK_CHANNEL_ID`
4. Invite the bot to the channel: type `/invite @ClaudeConnect` in the channel

---

## Step 9: Configure ClaudeConnect

1. In your ClaudeConnect project, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```

2. Fill in your tokens:
   ```
   SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
   SLACK_APP_TOKEN=xapp-your-actual-app-token
   SLACK_CHANNEL_ID=C0ABC123DEF
   ```

3. Start ClaudeConnect:
   ```
   npm run dev
   ```

4. You should see:
   ```
   Starting ClaudeConnect...
   Connecting to Slack (Socket Mode)...
   Slack connected!
   Bridge server listening on http://localhost:3456
   Control panel posted to Slack
   ClaudeConnect is running!
   ```

5. Check the #claude-connect channel — you should see the **Control Panel** message with mode buttons.

---

## Step 10: Configure Claude Code Hooks

Add the hook configuration to your global Claude Code settings:

**File:** `~/.claude/settings.json` (Windows: `C:\Users\<you>\.claude\settings.json`)

Merge the contents of `claude-hooks/settings-snippet.json` into your settings file. If the file doesn't exist, create it with just the hook configuration.

The hooks tell Claude Code to send HTTP requests to the bridge server whenever it needs permission, sends a notification, or finishes a response.

---

## Optional: Auto-Start on Login

To have ClaudeConnect start automatically when you log into Windows:

1. Create a file called `claude-connect.vbs` in your Startup folder:
   ```
   C:\Users\<you>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
   ```

2. Paste this into the file (update the path to your ClaudeConnect install):
   ```vbs
   Set WshShell = CreateObject("WScript.Shell")
   WshShell.Run "cmd /c cd /d d:\ClaudeConnect && npx tsx src/index.ts", 0, False
   ```

The bridge will start silently in the background on every login. To stop it: `taskkill /F /IM node.exe`.

---

## Troubleshooting

**Bot doesn't respond to button clicks:**
- Make sure Interactivity is enabled (Step 5)
- Make sure Socket Mode is enabled (Step 2)

**Bot doesn't see messages in channel:**
- Make sure `message.channels` event is subscribed (Step 6)
- Make sure the bot is invited to the channel (`/invite @ClaudeConnect`)

**"Missing required environment variable" error:**
- Make sure `.env` exists and has all 3 tokens filled in
- Make sure there are no quotes around the values (just paste the raw token)

**`/cc` command not working:**
- Make sure the slash command is created (Step 6)
- Make sure Socket Mode is enabled (Step 2)
- Make sure the app is reinstalled after adding the command

**Claude Code hooks not firing:**
- Make sure the bridge server is running (`npm run dev`)
- Make sure `settings.json` has the hooks configured (Step 10)
- Restart Claude Code after changing settings
