# Telegram Bot Setup Guide

Follow these steps to create a Telegram bot and get the necessary IDs for ClaudeConnect.

## 1. Create a Telegram Bot

1. Open Telegram and search for the **@BotFather** bot.
2. Start a chat with BotFather and send the command `/newbot`.
3. Follow the prompts to:
    - Give your bot a name (e.g., "My ClaudeConnect bot").
    - Give your bot a username (must end in `bot`, e.g., `my_claude_connect_bot`).
4. Once completed, BotFather will give you an **HTTP API Token**.
    - It looks like this: `1234567890:AbCDefGhIJKLmnopQRstUVwxyZ`.
    - This is your `TELEGRAM_BOT_TOKEN`. Keep it secret!

## 2. Get Your Chat ID

The bot needs to know which chat to send messages to (your personal chat with the bot).

1. Search for the **@userinfobot** in Telegram and start a chat with it.
2. It will reply with your user ID, which is a number (e.g., `123456789`).
3. This number is your `TELEGRAM_CHAT_ID`.

*(Alternatively, you can just send a message to your new bot, then go to `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser and look for the `"chat":{"id":...}` field).*

## 3. Configure the Bot

1. Copy `.env.example` to `.env` in the root of the project.
2. Paste the token and chat ID you gathered into the `.env` file:

```
TELEGRAM_BOT_TOKEN=1234567890:AbCDefGhIJKLmnopQRstUVwxyZ
TELEGRAM_CHAT_ID=123456789
```

That's it! Start the ClaudeConnect server with `npm run dev` and send a message to your bot on Telegram to verify the connection.
