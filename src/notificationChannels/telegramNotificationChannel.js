import { Queue, Worker } from "bullmq";
import { NotificationChannel } from "./notificationChannel";

export class TelegramNotificationChannel extends NotificationChannel {
  constructor({
    name,
    token,
    group,
    baseUrl = "https://api.telegram.org/",
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
      duration: 1000
    },
    redis
  }) {
    super();
    if (!token) throw new Error("Telegram token is required");
    if (!group) throw new Error("Telegram group id is required");
    this.name = name;
    this.type = "telegram";
    this.token = token;
    this.group = group;
    this.baseUrl = baseUrl;
    this.emoji = emoji;
    this.queue = new Queue(this.name, { limiter, connection: redis });
    return this;
  }

  serve() {
    this.worker = new Worker(this.name, async (job) => {
      console.log("JOB DATA", job.data);
      return "ended";
    });
    this.worker.on("failed", (job, err) => {
      console.error(`${job.id} has failed with ${err.message}`);
    });
    this.worker.on("error", (err) => {
      console.error(err);
    });
  }
}
