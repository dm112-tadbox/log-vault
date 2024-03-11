/* eslint-disable no-useless-escape */
import { Job } from "bullmq";
import { NotificationChannel } from "./NotificationChannel";
import axios from "axios";
import { render } from "mustache";
import {
  NotificatonTransportLogItem,
  TelegramNotificationChannelOptions
} from "../../types";

const basicTemplate = `{{emojiLevel}} *{{level}} log message* {{#timestamp}}⏱ _{{timestamp}}_{{/timestamp}}

{{#meta}}
\`[{{label}}]: {{value}}\`
{{/meta}}
{{#shrinked}}
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

function renderLogMessage(template: string, log: NotificatonTransportLogItem) {
  const { level, message, timestamp, meta = {} } = log;

  const limit = 2048;
  const { shrinked, shrinkedMessage } = shrinkStringSize(
    JSON.stringify(message, null, 2),
    limit
  );

  const unescaped: {
    level: string;
    message: string | string[];
    timestamp?: string;
    meta: {
      label: string;
      value: string;
    }[];
  } = {
    level: unescape(level),
    message: unescape(shrinkedMessage),
    timestamp: unescape(timestamp),
    meta: Object.keys(meta).map((label) => ({
      label,
      value: unescape(meta[label]?.toString())
    }))
  };

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
  constructor(opts: TelegramNotificationChannelOptions) {
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
          const log: NotificatonTransportLogItem = job.data;
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
        limiter: {
          max: 1,
          duration: 5000
        },
        ...workerOptions
      }
    });
  }
}
