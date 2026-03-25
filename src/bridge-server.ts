import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import {
  PermissionRequestPayload,
  NotificationPayload,
  StopPayload,
  PermissionRequestResponse,
} from "./types";
import { createPendingRequest, setSlackMessageTs } from "./pending-requests";
import { postToSlack } from "./slack-app";
import {
  formatPermissionRequest,
  formatNotification,
  formatStopMessage,
} from "./formatters";

export const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Permission Request Hook ---
app.post("/hooks/permission-request", async (req, res) => {
  try {
    const payload = req.body as PermissionRequestPayload;

    console.log(`[PermissionRequest] Tool: ${payload.tool_name}`);

    // Post to Slack, wait for user response
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
      const requestId = uuidv4();
      const blocks = formatStopMessage(payload, requestId, true);

      postToSlack(
        blocks,
        `Claude asks: ${message.slice(0, 200)}`
      );

      res.json({});
    } else {
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

  const tail = message.slice(-500).toLowerCase();

  if (/\?\s*$/.test(tail)) return true;

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
