import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import {
  PermissionRequestPayload,
  NotificationPayload,
  StopPayload,
  PermissionRequestResponse,
} from "./types";
import { getMode } from "./mode-manager";
import { createPendingRequest, setSlackMessageTs } from "./pending-requests";
import { postToSlack } from "./slack-app";
import {
  formatPermissionRequest,
  formatAutoLog,
  formatPlanDenial,
  formatNotification,
  formatStopMessage,
} from "./formatters";

export const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", mode: getMode() });
});

// --- Permission Request Hook ---
app.post("/hooks/permission-request", async (req, res) => {
  try {
    const payload = req.body as PermissionRequestPayload;
    const mode = getMode();

    console.log(`[PermissionRequest] Tool: ${payload.tool_name} | Mode: ${mode}`);

    // Auto mode — approve immediately, log quietly
    if (mode === "auto") {
      const autoResponse: PermissionRequestResponse = {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "allow" },
        },
      };
      // Fire-and-forget Slack log
      postToSlack(formatAutoLog(payload), `Auto-approved: ${payload.tool_name}`);
      res.json(autoResponse);
      return;
    }

    // Plan mode — deny with instruction to describe instead
    if (mode === "plan") {
      const planResponse: PermissionRequestResponse = {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior: "deny",
            message:
              "User is in plan-only mode via Slack. Do NOT execute this action. Instead, describe what you would do and why, then wait for further instructions.",
          },
        },
      };
      postToSlack(formatPlanDenial(payload), `Plan mode denied: ${payload.tool_name}`);
      res.json(planResponse);
      return;
    }

    // Ask mode — post to Slack, wait for user response
    const requestId = uuidv4();
    const blocks = formatPermissionRequest(payload, requestId);

    const messageTs = await postToSlack(
      blocks,
      `Permission request: ${payload.tool_name}`
    );

    if (messageTs) {
      setSlackMessageTs(requestId, messageTs, config.SLACK_CHANNEL_ID);
    }

    // Hold HTTP connection open until Slack user responds or timeout
    const response = await createPendingRequest(requestId, "PermissionRequest");
    res.json(response);
  } catch (err) {
    console.error("[PermissionRequest] Error:", err);
    res.json({}); // Never block Claude
  }
});

// --- Notification Hook ---
app.post("/hooks/notification", async (req, res) => {
  try {
    const payload = req.body as NotificationPayload;
    console.log(`[Notification] Type: ${payload.notification_type || "unknown"}`);

    await postToSlack(
      formatNotification(payload),
      `Notification: ${payload.message || "Claude needs attention"}`
    );

    res.json({});
  } catch (err) {
    console.error("[Notification] Error:", err);
    res.json({});
  }
});

// --- Stop Hook ---
app.post("/hooks/stop", async (req, res) => {
  try {
    const payload = req.body as StopPayload;
    const message = payload.last_assistant_message || "";

    // Heuristic: detect if Claude is asking a question
    const isQuestion = detectQuestion(message);

    console.log(`[Stop] Question detected: ${isQuestion}`);

    if (isQuestion) {
      // Post question to Slack, return immediately (don't block Claude Code)
      const requestId = uuidv4();
      const blocks = formatStopMessage(payload, requestId, true);

      postToSlack(
        blocks,
        `Claude asks: ${message.slice(0, 200)}`
      );

      // Return immediately — reply will come via keyboard injection
      res.json({});
    } else {
      // Not a question — just log completion and return immediately
      const requestId = uuidv4();
      postToSlack(
        formatStopMessage(payload, requestId, false),
        `Claude finished: ${message.slice(0, 200)}`
      );
      res.json({});
    }
  } catch (err) {
    console.error("[Stop] Error:", err);
    res.json({});
  }
});

/** Simple heuristic to detect if Claude is asking a question */
function detectQuestion(message: string): boolean {
  if (!message) return false;

  // Check the last ~500 chars for question patterns
  const tail = message.slice(-500).toLowerCase();

  // Ends with question mark
  if (/\?\s*$/.test(tail)) return true;

  // Common question phrases
  const questionPhrases = [
    "would you like",
    "should i",
    "do you want",
    "which option",
    "what would you prefer",
    "please choose",
    "please select",
    "let me know",
    "your thoughts",
    "what do you think",
    "how would you like",
    "would you prefer",
  ];

  return questionPhrases.some((phrase) => tail.includes(phrase));
}

export function startBridgeServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.BRIDGE_PORT, () => {
      console.log(`Bridge server listening on http://localhost:${config.BRIDGE_PORT}`);
      resolve();
    });
  });
}
