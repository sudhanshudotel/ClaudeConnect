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
  SLACK_BOT_TOKEN: requireEnv("SLACK_BOT_TOKEN"),
  SLACK_APP_TOKEN: requireEnv("SLACK_APP_TOKEN"),
  SLACK_CHANNEL_ID: requireEnv("SLACK_CHANNEL_ID"),
  BRIDGE_PORT: parseInt(process.env.BRIDGE_PORT || "3456", 10),
  HOOK_TIMEOUT_SECONDS: parseInt(process.env.HOOK_TIMEOUT_SECONDS || "120", 10),
};
