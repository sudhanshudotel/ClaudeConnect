import { App, LogLevel } from "@slack/bolt";
import { config } from "./config";
import { Mode, MODE_LABELS, MODE_DESCRIPTIONS, PermissionRequestResponse } from "./types";
import { getMode, setMode } from "./mode-manager";
import { resolvePendingRequest } from "./pending-requests";
import { formatControlPanel, formatPermissionResolved } from "./formatters";
import { injectTextToVSCode } from "./inject-input";

let controlPanelTs: string | undefined;

export const slackApp = new App({
  token: config.SLACK_BOT_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.WARN,
});

// --- Permission button handlers ---

slackApp.action("permission_allow", async ({ action, ack, respond, body }) => {
  await ack();
  if (action.type !== "button" || !action.value) return;

  const requestId = action.value;
  const userName = "user" in body ? `<@${body.user.id}>` : "someone";

  const response: PermissionRequestResponse = {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  };

  const resolved = resolvePendingRequest(requestId, response);
  if (resolved) {
    await respond({
      replace_original: true,
      blocks: formatPermissionResolved(
        "Tool",
        "allow",
        userName
      ),
    });
    console.log(`Permission allowed by ${userName} (request: ${requestId})`);
  } else {
    await respond({
      replace_original: false,
      text: "This request has already been handled or timed out.",
    });
  }
});

slackApp.action("permission_deny", async ({ action, ack, respond, body }) => {
  await ack();
  if (action.type !== "button" || !action.value) return;

  const requestId = action.value;
  const userName = "user" in body ? `<@${body.user.id}>` : "someone";

  const response: PermissionRequestResponse = {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "deny",
        message: `Denied by user via Slack`,
      },
    },
  };

  const resolved = resolvePendingRequest(requestId, response);
  if (resolved) {
    await respond({
      replace_original: true,
      blocks: formatPermissionResolved(
        "Tool",
        "deny",
        userName
      ),
    });
    console.log(`Permission denied by ${userName} (request: ${requestId})`);
  } else {
    await respond({
      replace_original: false,
      text: "This request has already been handled or timed out.",
    });
  }
});

// --- Mode switcher button handlers ---

for (const mode of ["ask", "auto", "plan"] as Mode[]) {
  slackApp.action(`mode_${mode}`, async ({ ack }) => {
    await ack();
    setMode(mode);
    await updateControlPanel();
    await postModeChangeNotification(mode);
  });
}

// --- Reply modal button handler ---

slackApp.action("open_reply_modal", async ({ action, ack, body, client }) => {
  await ack();
  if (action.type !== "button" || !action.value) return;
  if (!("trigger_id" in body)) return;

  const requestId = action.value;

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "reply_modal_submit",
      private_metadata: requestId,
      title: { type: "plain_text", text: "Reply to Claude" },
      submit: { type: "plain_text", text: "Send" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "reply_block",
          label: { type: "plain_text", text: "Your response" },
          element: {
            type: "plain_text_input",
            action_id: "reply_input",
            multiline: true,
            placeholder: { type: "plain_text", text: "Type your response to Claude..." },
          },
        },
      ],
    },
  });
});

// --- Reply modal submission handler ---

slackApp.view("reply_modal_submit", async ({ ack, view, body }) => {
  await ack();
  const userResponse = view.state.values.reply_block.reply_input.value || "";
  const userName = `<@${body.user.id}>`;

  console.log(`[Reply] Injecting text from ${userName}: ${userResponse}`);

  // Inject the reply directly into VSCode via keyboard simulation
  const success = await injectTextToVSCode(userResponse);

  if (success) {
    await postToSlack(
      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Reply sent by ${userName}:* "${userResponse}"`,
          },
        },
      ],
      `Reply sent: ${userResponse}`
    );
  } else {
    await postToSlack(
      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `⚠️ *Could not inject reply* — VSCode window not found. Make sure VSCode is open.`,
          },
        },
      ],
      "Injection failed"
    );
  }
});

// --- Slash command: /cc ---

slackApp.command("/cc", async ({ command, ack }) => {
  await ack();
  const text = command.text.trim();
  const userName = `<@${command.user_id}>`;

  if (!text) {
    await postToSlack(
      [{ type: "section", text: { type: "mrkdwn", text: `⚠️ Usage: \`/cc your message to Claude\`` } }],
      "Empty /cc command"
    );
    return;
  }

  // Mode shortcuts via slash command
  if (text === "ask" || text === "auto" || text === "plan") {
    const mode = text as Mode;
    setMode(mode);
    await updateControlPanel();
    await postModeChangeNotification(mode);
    return;
  }

  console.log(`[/cc] Injecting text from ${userName}: ${text}`);

  const success = await injectTextToVSCode(text);

  if (success) {
    await postToSlack(
      [{ type: "section", text: { type: "mrkdwn", text: `✅ *${userName}:* ${text}` } }],
      `Slash reply: ${text}`
    );
  } else {
    await postToSlack(
      [{ type: "section", text: { type: "mrkdwn", text: `⚠️ *Could not inject reply* — VSCode window not found.` } }],
      "Injection failed"
    );
  }
});

// --- Control Panel ---

export async function postControlPanel(): Promise<void> {
  try {
    const result = await slackApp.client.chat.postMessage({
      channel: config.SLACK_CHANNEL_ID,
      blocks: formatControlPanel(getMode()),
      text: `ClaudeConnect Control Panel — Mode: ${MODE_LABELS[getMode()]}`,
    });
    controlPanelTs = result.ts;
    console.log("Control panel posted to Slack");
  } catch (err) {
    console.error("Failed to post control panel:", err);
  }
}

async function updateControlPanel(): Promise<void> {
  if (!controlPanelTs) {
    await postControlPanel();
    return;
  }

  try {
    await slackApp.client.chat.update({
      channel: config.SLACK_CHANNEL_ID,
      ts: controlPanelTs,
      blocks: formatControlPanel(getMode()),
      text: `ClaudeConnect Control Panel — Mode: ${MODE_LABELS[getMode()]}`,
    });
  } catch {
    // If update fails (message too old), post a new one
    await postControlPanel();
  }
}

async function postModeChangeNotification(mode: Mode): Promise<void> {
  try {
    await slackApp.client.chat.postMessage({
      channel: config.SLACK_CHANNEL_ID,
      text: `Mode switched to *${MODE_LABELS[mode]}* — ${MODE_DESCRIPTIONS[mode]}`,
      mrkdwn: true,
    });
  } catch (err) {
    console.error("Failed to post mode change notification:", err);
  }
}

/** Post blocks to the configured Slack channel */
export async function postToSlack(
  blocks: (import("@slack/types").KnownBlock | import("@slack/types").Block)[],
  text: string
): Promise<string | undefined> {
  try {
    const result = await slackApp.client.chat.postMessage({
      channel: config.SLACK_CHANNEL_ID,
      blocks: blocks as any,
      text,
    });
    return result.ts;
  } catch (err) {
    console.error("Failed to post to Slack:", err);
    return undefined;
  }
}
