import { Job, WorkerOptions } from "bullmq";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./NotificationChannel";
import axios from "axios";
import { render } from "mustache";
import { LogRecord } from "../../types/LogRecord";

export interface TelegramNotificationChannelOpts
  extends NotificationChannelOpts {
  token: string;
  chatId: number;
  host?: string;
  template?: string;
  workerOptions?: Partial<WorkerOptions>;
}

const basicTemplate = `{{emojiLevel}} {{level}}
*environment*: {{labels.environment}}
\`\`\`
{{message}}
\`\`\`
`;

const emojiLevels = [
  { level: "error", emoji: "🔴" },
  { level: "warn", emoji: "🟡" },
  { level: "info", emoji: "🟢" },
  { level: "http", emoji: "🔵" },
  { level: "verbose", emoji: "🟣" },
  { level: "debug", emoji: "🪲" },
  { level: "silly", emoji: "🐤" }
];

function getEmojiLevel(level: string) {
  return Object.keys(emojiLevels).includes(level) ? emojiLevels[level] : "🐤";
}

export class TelegramNotificationChannel extends NotificationChannel {
  constructor(opts: TelegramNotificationChannelOpts) {
    super(opts);

    const {
      host = "https://api.telegram.org/bot",
      token,
      workerOptions = {},
      chatId,
      template = basicTemplate
    } = opts;
    const baseURL = new URL(`/bot${token}`, host).toString();

    this.process({
      queueName: `${token}:${chatId}`,
      processor: async (job: Job) => {
        try {
          const log: LogRecord = job.data;
          await axios({
            method: "post",
            baseURL,
            url: "sendMessage",
            data: {
              chat_id: chatId,
              text: render(template, {
                ...log,
                emojiLevel: getEmojiLevel[log.level]
              }),
              parse_mode: "MarkdownV2"
            }
          });
        } catch (error) {
          console.error(error);
        }
        console.log("Sending to TG:\n", job.data);
        return job.data;
      },
      workerOptions: {
        ...workerOptions,
        ...(!workerOptions.limiter && {
          limiter: {
            max: 1,
            duration: 5000
          }
        })
      }
    });
  }
}
