import type { KnownBlock, Block } from "@slack/types";
import { PermissionRequestPayload, NotificationPayload, StopPayload, Mode, MODE_LABELS } from "./types";

const MAX_TEXT_LENGTH = 2500;

function truncate(text: string, max = MAX_TEXT_LENGTH): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n... (truncated)";
}

function shortSessionId(sessionId: string): string {
  return sessionId.slice(-6);
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

/** Permission request → Slack blocks with Allow/Deny buttons */
export function formatPermissionRequest(
  payload: PermissionRequestPayload,
  requestId: string
): (KnownBlock | Block)[] {
  const inputText = formatToolInput(payload.tool_name, payload.tool_input);

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `🔒 Permission Request`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Claude wants to use *${payload.tool_name}*`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\`${truncate(inputText)}\`\`\``,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Session: \`${shortSessionId(payload.session_id)}\`` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Allow", emoji: true },
          style: "primary",
          action_id: "permission_allow",
          value: requestId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Deny", emoji: true },
          style: "danger",
          action_id: "permission_deny",
          value: requestId,
        },
      ],
    },
  ];
}

/** Auto-mode quiet log message */
export function formatAutoLog(payload: PermissionRequestPayload): (KnownBlock | Block)[] {
  const inputSummary = formatToolInput(payload.tool_name, payload.tool_input);
  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⚡ Auto-approved *${payload.tool_name}*: \`${truncate(inputSummary, 200)}\` _(session: ${shortSessionId(payload.session_id)})_`,
        },
      ],
    },
  ];
}

/** Plan-mode denial log */
export function formatPlanDenial(payload: PermissionRequestPayload): (KnownBlock | Block)[] {
  const inputSummary = formatToolInput(payload.tool_name, payload.tool_input);
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📋 *Plan mode* — denied *${payload.tool_name}*\n\`\`\`${truncate(inputSummary, 500)}\`\`\``,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Session: \`${shortSessionId(payload.session_id)}\`` },
      ],
    },
  ];
}

/** Notification → Slack blocks */
export function formatNotification(payload: NotificationPayload): (KnownBlock | Block)[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔔 *Notification* (${payload.notification_type || "info"})\n${payload.message || "Claude needs your attention."}`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Session: \`${shortSessionId(payload.session_id)}\`` },
      ],
    },
  ];
}

/** Stop hook → Slack blocks (shows Claude's last message, prompts for reply if question) */
export function formatStopMessage(
  payload: StopPayload,
  requestId: string,
  isQuestion: boolean
): (KnownBlock | Block)[] {
  const message = payload.last_assistant_message || "(no message)";
  const blocks: (KnownBlock | Block)[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: isQuestion
          ? `❓ *Claude is asking:*\n${truncate(message, 2000)}`
          : `✅ *Claude finished:*\n${truncate(message, 2000)}`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Session: \`${shortSessionId(payload.session_id)}\`` },
      ],
    },
  ];

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "💬 Reply to Claude", emoji: true },
        ...(isQuestion ? { style: "primary" as const } : {}),
        action_id: "open_reply_modal",
        value: requestId,
      },
    ],
  });

  return blocks;
}

/** Control panel with mode buttons */
export function formatControlPanel(activeMode: Mode): (KnownBlock | Block)[] {
  const modeButton = (mode: Mode, emoji: string) => {
    const isActive = mode === activeMode;
    return {
      type: "button" as const,
      text: {
        type: "plain_text" as const,
        text: `${emoji} ${MODE_LABELS[mode]}${isActive ? " ●" : ""}`,
        emoji: true,
      },
      action_id: `mode_${mode}`,
      ...(isActive ? { style: "primary" as const } : {}),
    };
  };

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🎛️ ClaudeConnect Control Panel", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Current mode: *${MODE_LABELS[activeMode]}*`,
      },
    },
    {
      type: "actions",
      elements: [
        modeButton("ask", "🔒"),
        modeButton("auto", "⚡"),
        modeButton("plan", "📋"),
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "You can also type `!ask`, `!auto`, or `!plan` to switch modes",
        },
      ],
    },
  ];
}

/** Updated permission message after user responds */
export function formatPermissionResolved(
  toolName: string,
  decision: "allow" | "deny",
  userName: string
): (KnownBlock | Block)[] {
  const emoji = decision === "allow" ? "✅" : "❌";
  const verb = decision === "allow" ? "Approved" : "Denied";
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${toolName}* — ${verb} by ${userName}`,
      },
    },
  ];
}
