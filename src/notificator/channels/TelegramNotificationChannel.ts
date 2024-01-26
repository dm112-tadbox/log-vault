import { Job, WorkerOptions } from "bullmq";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./NotificationChannel";

export interface TelegramNotificationChannelOpts
  extends NotificationChannelOpts {
  token: string;
  chatId: number;
  host?: string;
  template?: string;
  workerOptions?: Partial<WorkerOptions>;
}

export class TelegramNotificationChannel extends NotificationChannel {
  baseUrl: string;

  constructor(opts: TelegramNotificationChannelOpts) {
    super(opts);

    const {
      host = "https://api.telegram.org/bot",
      token,
      workerOptions = {},
      chatId
    } = opts;
    this.baseUrl = new URL(`bot${token}`, host).toString();

    this.process({
      queueName: `${token}:${chatId}`,
      processor: async (job: Job) => {
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
