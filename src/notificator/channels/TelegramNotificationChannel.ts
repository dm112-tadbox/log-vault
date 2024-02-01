/* eslint-disable no-useless-escape */
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

const basicTemplate = `{{emojiLevel}} *{{level}} log message*

{{#timestamp}}
⏱ _{{timestamp}}_
{{/timestamp}}
{{#labels.project}}*project*: {{labels.project}}{{/labels.project}}{{#labels.environment}}
*environment*: {{labels.environment}}{{/labels.environment}}{{#labels.process}}
*process*: {{labels.process}}{{/labels.process}}{{#labels.method}}
*method*: {{labels.method}}{{/labels.method}}{{#labels.user}}
*user*: {{labels.user}}{{/labels.user}}{{#shrinked}}
>The message is shrinked as it's over {{shrinked}} characters length\\.
>Please, consider a more accurate handler for this log entry in your code\\.
{{/shrinked}}

\`\`\`json
{{{message}}}
\`\`\``;

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
  const { level, message, timestamp, labels = {} } = log;

  const limit = 2048;
  const { shrinked, shrinkedMessage } = shrinkStringSize(
    message.toString(),
    limit
  );

  const unescaped: {
    level: string;
    message: string | string[];
    timestamp?: string;
    labels: {
      [key: string]: string;
    };
  } = {
    level: unescape(level),
    message: unescape(shrinkedMessage),
    timestamp: unescape(timestamp),
    labels: {}
  };

  for (const key of Object.keys(labels)) {
    unescaped.labels[key] = unescape(labels[key]);
  }

  const rendered = render(template, {
    ...unescaped,
    emojiLevel: getEmojiLevel(log.level),
    shrinked: shrinked ? limit : undefined
  });

  return rendered;

  function unescape(str?: string) {
    return str?.replace(/([|{[\]*_~}+)(#>!=\-.])/gm, "\\$1") || "";
  }
}

function shrinkStringSize(
  str: string,
  limit: number
): { shrinkedMessage: string; shrinked: boolean } {
  const shrinked = str.length > limit;
  return {
    shrinkedMessage: str.substring(0, limit),
    shrinked
  };
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
