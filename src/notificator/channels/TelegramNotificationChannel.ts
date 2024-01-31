import { Job, WorkerOptions } from "bullmq";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./NotificationChannel";
import axios from "axios";
import { render } from "mustache";
import { LogRecord } from "../../types/LogRecord";
import { InspectOptions, inspect } from "node:util";

export interface TelegramNotificationChannelOpts
  extends NotificationChannelOpts {
  token: string;
  chatId: number;
  host?: string;
  template?: string;
  workerOptions?: Partial<WorkerOptions>;
}

const basicTemplate = `{{emojiLevel}} *{{level}} log message*

{{#timestamp}}
⏱ _{{timestamp}}_
{{/timestamp}}
{{#labels.project}}*project*: {{labels.project}}{{/labels.project}}{{#labels.environment}}
*environment*: {{labels.environment}}{{/labels.environment}}{{#labels.process}}
*process*: {{labels.process}}{{/labels.process}}{{#labels.method}}
*method*: {{labels.method}}{{/labels.method}}{{#labels.user}}
*user*: {{labels.user}}{{/labels.user}}

\`\`\`json
{{{message}}}
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
  const item = emojiLevels.find((item) => item.level === level);
  return item?.emoji || "🔵";
}

function renderLogMessage(
  template: string,
  log: LogRecord,
  inspectOptions: InspectOptions
) {
  const { level, message, timestamp, labels } = log;
  const unescaped: {
    level: string;
    message: string;
    timestamp?: string;
    labels: {
      [key: string]: string;
    };
  } = {
    level: unescape(level),
    message: inspect(message, inspectOptions),
    timestamp: unescape(timestamp),
    labels: {}
  };

  for (const key of Object.keys(labels)) {
    unescaped.labels[key] = unescape(labels[key]);
  }

  const rendered = render(template, {
    ...unescaped,
    emojiLevel: getEmojiLevel(log.level)
  });

  return rendered;

  function unescape(str?: string) {
    return str?.replace(/([|{[\]*_~}+)(#>!=\-.])/gm, "\\$1") || "";
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
              text: renderLogMessage(template, log, this.inspectOptions || {}),
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
