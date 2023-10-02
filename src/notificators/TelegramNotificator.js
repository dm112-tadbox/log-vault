import { Queue } from "bullmq";
import sha256 from "sha256";

export class TelegramNotificator {
  constructor({
    prefix = "logvault-telegram",
    token,
    group,
    baseUrl,
    level,
    emoji = {
      error: "🔴",
      warn: "🟡",
      info: "🟢",
      http: "🔵",
      verbose: "🟣",
      debug: "🟤",
      silly: "⚪"
    },
    limiter = {
      max: 1,
      duration: 5000
    },
    redis
  }) {
    console.log(redis);
    if (!token) throw new Error("Telegram token is required");
    if (!group) throw new Error("Telegram group id is required");
    this.token = token;
    this.group = group;
    this.baseUrl = baseUrl;
    this.emoji = emoji;
    this.level = level;
    this.queue = new Queue(prefix, { limiter, connection: redis });

    return this;
  }

  async addToQueue(message, metadata) {
    metadata.message = message;
    const stringifiedData = JSON.stringify(metadata);
    const stringifiedMessage =
      typeof message === "string" ? message : JSON.stringify(message);
    const matched = this.regExp.test(stringifiedMessage);
    if (!matched) return;
    const hash = sha256(stringifiedData);
    await this.queue.add(hash, { message, metadata });
  }
}
