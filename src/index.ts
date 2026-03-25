import { config } from "./config";
import { slackApp, postControlPanel } from "./slack-app";
import { startBridgeServer } from "./bridge-server";

async function main() {
  console.log("Starting ClaudeConnect...\n");

  // Start Slack app (Socket Mode)
  console.log("Connecting to Slack (Socket Mode)...");
  await slackApp.start();
  console.log("Slack connected!\n");

  // Start Express bridge server
  await startBridgeServer();
  console.log("");

  // Post control panel to Slack
  await postControlPanel();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" ClaudeConnect is running!");
  console.log(` Bridge: http://localhost:${config.BRIDGE_PORT}`);
  console.log(` Slack channel: ${config.SLACK_CHANNEL_ID}`);
  console.log(" Mode: Ask Before Edits (default)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nWaiting for Claude Code hook events...\n");
}

main().catch((err) => {
  console.error("Failed to start ClaudeConnect:", err);
  process.exit(1);
});
