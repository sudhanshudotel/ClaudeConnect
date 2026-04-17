import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error(`Copy .env.example to .env and fill in your values.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_CHAT_ID: requireEnv("TELEGRAM_CHAT_ID"),
  BRIDGE_PORT: parseInt(process.env.BRIDGE_PORT || "3456", 10),
  HOOK_TIMEOUT_SECONDS: parseInt(process.env.HOOK_TIMEOUT_SECONDS || "120", 10),
};
