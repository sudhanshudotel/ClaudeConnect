import { Telegraf, Context } from "telegraf";
import { config } from "./config";
import { PermissionRequestResponse } from "./types";
import { resolvePendingRequest } from "./pending-requests";
import { formatResolutionSuffix, FormattedTelegramMessage } from "./formatters";
import { injectTextToVSCode } from "./inject-input";

export const telegramBot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// --- Permission callback handlers ---

async function handlePermissionDecision(
  ctx: Context,
  requestId: string,
  decision: "allow" | "deny"
): Promise<void> {
  const userName = ctx.from?.first_name || "user";
  const behavior = decision === "allow" ? "allow" : "deny";

  const response: PermissionRequestResponse = {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision:
        decision === "allow"
          ? { behavior: "allow" }
          : { behavior: "deny", message: "Denied by user via Telegram" },
    },
  };

  const resolved = resolvePendingRequest(requestId, response);

  // Pull the original message so we can append rather than overwrite it.
  const message = ctx.callbackQuery?.message;
  const originalText =
    message && "text" in message && typeof message.text === "string" ? message.text : "";

  if (resolved) {
    const suffix = formatResolutionSuffix(decision, userName);
    const newText = originalText ? `${originalText}\n\n${suffix}` : suffix;
    try {
      await ctx.editMessageText(newText, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
    console.log(`Permission ${behavior}ed by ${userName} (request: ${requestId})`);
    return;
  }

  // Already resolved (timed out or double-tapped).
  await ctx.answerCbQuery("This request has already been handled or timed out.");
  try {
    const newText = originalText
      ? `${originalText}\n\n<i>[Expired or already handled]</i>`
      : "[Expired or already handled]";
    await ctx.editMessageText(newText, { parse_mode: "HTML" });
  } catch {
    // Silent — message may already be stale or deleted.
  }
}

telegramBot.action(/^allow:(.+)$/, (ctx) => handlePermissionDecision(ctx, ctx.match[1], "allow"));
telegramBot.action(/^deny:(.+)$/, (ctx) => handlePermissionDecision(ctx, ctx.match[1], "deny"));

// --- /cc command — inject text into VSCode ---

telegramBot.command("cc", async (ctx) => {
  const text = ctx.message.text.replace(/^\/cc\s*/, "").trim();
  const userName = ctx.from?.first_name || "user";

  if (!text) {
    await ctx.reply("⚠️ Usage: `/cc your message to Claude`", { parse_mode: "Markdown" });
    return;
  }

  console.log(`[/cc] Injecting text from ${userName}: ${text}`);

  const success = await injectTextToVSCode(text);

  if (success) {
    await ctx.reply(`✅ <b>${userName}:</b> ${text}`, { parse_mode: "HTML" });
  } else {
    await ctx.reply("⚠️ <b>Could not inject reply</b> — VSCode window not found.", {
      parse_mode: "HTML",
    });
  }
});

// --- General message handler — any text in the configured chat is treated as a reply ---

telegramBot.on("text", async (ctx) => {
  if (String(ctx.chat.id) !== String(config.TELEGRAM_CHAT_ID)) return;

  const text = ctx.message.text.trim();
  const userName = ctx.from?.first_name || "user";

  console.log(`[Message] Injecting text from ${userName}: ${text}`);
  const success = await injectTextToVSCode(text);

  if (!success) {
    await ctx.reply("⚠️ <b>Could not inject reply</b> — VSCode window not found.", {
      parse_mode: "HTML",
    });
  }
});

// --- Startup message ---

export async function postControlPanel(): Promise<void> {
  try {
    await telegramBot.telegram.sendMessage(
      config.TELEGRAM_CHAT_ID,
      "🎛️ <b>ClaudeConnect is running</b>\n\nPermission requests will appear here. Reply directly or use <code>/cc your message</code> to reply to Claude.",
      { parse_mode: "HTML" }
    );
    console.log("Control panel posted to Telegram");
  } catch (err) {
    console.error("Failed to post control panel:", err);
  }
}

/** Post a formatted message to the configured Telegram chat. Returns the message ID on success. */
export async function postToTelegram(
  formatted: FormattedTelegramMessage
): Promise<number | undefined> {
  try {
    const result = await telegramBot.telegram.sendMessage(
      config.TELEGRAM_CHAT_ID,
      formatted.text,
      {
        parse_mode: "HTML",
        reply_markup: formatted.reply_markup,
      }
    );
    return result.message_id;
  } catch (err) {
    console.error("Failed to post to Telegram:", err);
    return undefined;
  }
}
