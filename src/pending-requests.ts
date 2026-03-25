import { PendingRequest } from "./types";
import { config } from "./config";

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Creates a pending request and returns a promise that resolves when
 * the Slack user responds (or rejects on timeout).
 * The Express route handler awaits this promise, keeping the HTTP connection open.
 */
export function createPendingRequest(id: string, hookEventName: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      // On timeout, resolve with empty object — Claude Code treats this as "no opinion"
      resolve({});
      console.log(`Request ${id} timed out after ${config.HOOK_TIMEOUT_SECONDS}s`);
    }, config.HOOK_TIMEOUT_SECONDS * 1000);

    const request: PendingRequest = {
      id,
      hookEventName,
      resolve,
      reject,
      timeout,
      createdAt: Date.now(),
    };

    pendingRequests.set(id, request);
  });
}

/**
 * Resolves a pending request with the given data.
 * Called by Slack action handlers when the user clicks a button or sends a reply.
 */
export function resolvePendingRequest(id: string, data: unknown): boolean {
  const request = pendingRequests.get(id);
  if (!request) {
    return false; // Already timed out or doesn't exist
  }

  clearTimeout(request.timeout);
  pendingRequests.delete(id);
  request.resolve(data);
  return true;
}

/**
 * Updates the Slack message timestamp for a pending request
 * (used to update the message after the user responds).
 */
export function setSlackMessageTs(id: string, ts: string, channelId: string): void {
  const request = pendingRequests.get(id);
  if (request) {
    request.slackMessageTs = ts;
    request.slackChannelId = channelId;
  }
}

