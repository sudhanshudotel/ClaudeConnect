import { config } from "./config";
import { telegramBot, postControlPanel } from "./telegram-app";
import { startBridgeServer } from "./bridge-server";

async function main() {
  console.log("Starting ClaudeConnect...\n");

  // Start Telegram bot
  console.log("Connecting to Telegram...");
  telegramBot.launch();
  console.log("Telegram connected!\n");

  // Start Express bridge server
  await startBridgeServer();
  console.log("");

  // Post control panel to Telegram
  await postControlPanel();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" ClaudeConnect is running!");
  console.log(` Bridge: http://localhost:${config.BRIDGE_PORT}`);
  console.log(` Telegram Chat ID: ${config.TELEGRAM_CHAT_ID}`);
  console.log(" Mode: Controlled by VSCode");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nWaiting for Claude Code hook events...\n");
}

main().catch((err) => {
  console.error("Failed to start ClaudeConnect:", err);
  process.exit(1);
});

// Enable graceful stop
process.once("SIGINT", () => telegramBot.stop("SIGINT"));
process.once("SIGTERM", () => telegramBot.stop("SIGTERM"));
