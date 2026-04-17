import { Markup } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { HookPayloadBase, PermissionRequestPayload, NotificationPayload, StopPayload } from "./types";

const MAX_TEXT_LENGTH = 3500; // Telegram limit is ~4096

function truncate(text: string, max = MAX_TEXT_LENGTH): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n... (truncated)";
}

function shortSessionId(sessionId: string): string {
  return sessionId.slice(-6);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function projectName(cwd?: string): string {
  if (!cwd) return "unknown";
  const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "unknown";
}

function currentTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function subtitle(payload: HookPayloadBase): string {
  return `<i>📁 ${escapeHtml(projectName(payload.cwd))}  ·  🕒 ${currentTime()}  ·  #${shortSessionId(payload.session_id)}</i>`;
}

function expandable(content: string): string {
  return `<blockquote expandable>${content}</blockquote>`;
}

/** Format the tool input for display based on tool type */
function formatToolInput(toolName: string, toolInput: Record<string, unknown>): string {
  if (toolName === "Bash" && typeof toolInput.command === "string") {
    return toolInput.command;
  }
  if ((toolName === "Edit" || toolName === "Write") && typeof toolInput.file_path === "string") {
    let text = `File: ${toolInput.file_path}`;
    if (typeof toolInput.old_string === "string") {
      text += `\nReplace: ${truncate(toolInput.old_string, 500)}`;
      text += `\nWith: ${truncate(String(toolInput.new_string || ""), 500)}`;
    } else if (typeof toolInput.content === "string") {
      text += `\nContent:\n${truncate(toolInput.content, 1000)}`;
    }
    return text;
  }
  if (toolName === "Read" && typeof toolInput.file_path === "string") {
    return `File: ${toolInput.file_path}`;
  }
  return truncate(JSON.stringify(toolInput, null, 2));
}

export interface FormattedTelegramMessage {
  text: string;
  reply_markup?: InlineKeyboardMarkup;
}

/** Permission request → Telegram HTML with Allow/Deny buttons */
export function formatPermissionRequest(
  payload: PermissionRequestPayload,
  requestId: string
): FormattedTelegramMessage {
  const inputText = formatToolInput(payload.tool_name, payload.tool_input);
  
  const text = `🔒 <b>Permission  ·  ${escapeHtml(payload.tool_name)}</b>
${subtitle(payload)}

${expandable(`<pre>${escapeHtml(truncate(inputText))}</pre>`)}`;

  const reply_markup = Markup.inlineKeyboard([
    Markup.button.callback("✅ Allow", `allow:${requestId}`),
    Markup.button.callback("❌ Deny", `deny:${requestId}`)
  ]).reply_markup;

  return { text, reply_markup };
}

/** Notification → Telegram HTML */
export function formatNotification(payload: NotificationPayload): FormattedTelegramMessage {
  const text = `🔔 <b>Notification  ·  ${escapeHtml(payload.notification_type || "info")}</b>
${subtitle(payload)}

${escapeHtml(payload.message || "Claude needs your attention.")}`;

  return { text };
}

/** Stop hook → Telegram HTML */
export function formatStopMessage(
  payload: StopPayload,
  isQuestion: boolean
): FormattedTelegramMessage {
  const message = payload.last_assistant_message || "(no message)";

  const body = expandable(escapeHtml(truncate(message, 3000)));
  const title = isQuestion ? "❓ <b>Claude is asking</b>" : "✅ <b>Claude finished</b>";

  const text = `${title}\n${subtitle(payload)}\n\n${body}`;

  return { text };
}

/** One-line resolution suffix appended to a permission message after the user responds */
export function formatResolutionSuffix(
  decision: "allow" | "deny",
  userName: string
): string {
  const emoji = decision === "allow" ? "✅" : "❌";
  const verb = decision === "allow" ? "Approved" : "Denied";
  return `${emoji} <b>${verb}</b> by ${escapeHtml(userName)}  ·  🕒 ${currentTime()}`;
}
