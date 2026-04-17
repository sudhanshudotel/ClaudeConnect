import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import {
  PermissionRequestPayload,
  NotificationPayload,
  StopPayload,
} from "./types";
import { createPendingRequest, setTelegramMessageId } from "./pending-requests";
import { postToTelegram } from "./telegram-app";
import {
  formatPermissionRequest,
  formatNotification,
  formatStopMessage,
} from "./formatters";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Permission Request ---
app.post("/hooks/permission-request", async (req, res) => {
  try {
    const payload = req.body as PermissionRequestPayload;
    console.log(`[PermissionRequest] Tool: ${payload.tool_name}`);

    const requestId = uuidv4();
    const formatted = formatPermissionRequest(payload, requestId);
    const messageId = await postToTelegram(formatted);

    if (messageId) {
      setTelegramMessageId(requestId, messageId, config.TELEGRAM_CHAT_ID);
    }

    // Hold the HTTP connection open until Telegram user responds (or timeout).
    const response = await createPendingRequest(requestId, "PermissionRequest");
    res.json(response);
  } catch (err) {
    console.error("[PermissionRequest] Error:", err);
    res.json({}); // Never block Claude on bridge errors.
  }
});

// --- Notification ---
app.post("/hooks/notification", async (req, res) => {
  try {
    const payload = req.body as NotificationPayload;
    console.log(`[Notification] Type: ${payload.notification_type || "unknown"}`);

    await postToTelegram(formatNotification(payload));
    res.json({});
  } catch (err) {
    console.error("[Notification] Error:", err);
    res.json({});
  }
});

// --- Stop ---
app.post("/hooks/stop", async (req, res) => {
  try {
    const payload = req.body as StopPayload;
    const message = payload.last_assistant_message || "";
    const isQuestion = detectQuestion(message);

    console.log(`[Stop] Question detected: ${isQuestion}`);

    await postToTelegram(formatStopMessage(payload, isQuestion));
    res.json({});
  } catch (err) {
    console.error("[Stop] Error:", err);
    res.json({});
  }
});

/** Heuristic — does Claude's last message end in a question or a prompt for user input? */
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
