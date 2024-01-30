import { Job, WorkerOptions } from "bullmq";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./NotificationChannel";
import axios from "axios";
import { render } from "mustache";
import { LogRecord } from "../../types/LogRecord";
import { Labels } from "../..";

export interface TelegramNotificationChannelOpts
  extends NotificationChannelOpts {
  token: string;
  chatId: number;
  host?: string;
  template?: string;
  workerOptions?: Partial<WorkerOptions>;
}

const basicTemplate = `{{emojiLevel}} *{{level}} log message*

{{#labels.project}}*project*: {{labels.project}}{{/labels.project}}{{#labels.environment}}
*environment*: {{labels.environment}}{{/labels.environment}}{{#labels.process}}
*process*: {{labels.process}}{{/labels.process}}{{#labels.method}}
*method*: {{labels.method}}{{/labels.method}}{{#labels.user}}
*user*: {{labels.user}}{{/labels.user}}

\`\`\`
{{message}}
\`\`\`
{{#timestamp}}
⏱ _{{timestamp}}_
{{/timestamp}}
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
  const item = emojiLevels.find((item) => item.level === level);
  return item?.emoji || "🔵";
}

function renderLogMessage(template: string, log: LogRecord) {
  const { level, message, timestamp, labels } = log;
  const unescaped: LogRecord = {
    level: unescape(level),
    message: unescape(message),
    timestamp: unescape(timestamp),
    labels: {}
  };
  for (const key of Object.keys(labels)) {
    unescaped.labels[key as keyof Labels] = unescape(labels[key]);
  }

  return render(template, {
    ...unescaped,
    emojiLevel: getEmojiLevel(log.level)
  });

  function unescape(str?: string) {
    // eslint-disable-next-line no-useless-escape
    return str?.replace(/([|{\[\]*_~}+)(#>!=\-.])/gm, "\\$1") || "";
  }
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
              text: renderLogMessage(template, log),
              parse_mode: "MarkdownV2"
            }
          });
        } catch (error) {
          console.error(error);
        }
        return job.data;
      },
      workerOptions: {
        ...workerOptions,
        limiter: workerOptions?.limiter || {
          max: 1,
          duration: 5000
        }
      }
    });
  }
}
