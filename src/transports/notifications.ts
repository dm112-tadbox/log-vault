import Transport from "winston-transport";
import { Queue, QueueOptions, RedisJobOptions } from "bullmq";
import { randomUUID as uuid } from "node:crypto";
import winston from "winston";
import { redisDefault } from "../defaults/connections";
import { removeOnCompleteDefault, removeOnFailDefault } from "../defaults/jobs";

export interface NotificationTransportOptions
  extends Transport.TransportStreamOptions {
  name?: string;
  opts?: QueueOptions;
  queueOptions?: QueueOptions;
  jobOptions?: RedisJobOptions;
}

class NotificationTransport extends Transport {
  queue: Queue;
  jobOptions: RedisJobOptions;

  constructor(options?: NotificationTransportOptions) {
    super(options);

    const { name, queueOptions, jobOptions } = options || {};
    this.jobOptions = jobOptions || {
      removeOnComplete: removeOnCompleteDefault,
      removeOnFail: removeOnFailDefault
    };

    this.queue = new Queue(
      name || "log-vault",
      queueOptions || {
        connection: redisDefault
      }
    );
  }

  async log(info: any, callback: any) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    try {
      await this.queue.add(
        uuid() /* Todo: notifications idempotence */,
        info,
        this.jobOptions
      );
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export function getNotificationTransport(
  options?: NotificationTransportOptions
) {
  options = options || {};
  if (options?.handleExceptions !== false) options.handleExceptions = true;
  if (options?.handleRejections !== false) options.handleRejections = true;
  if (!options?.format)
    options.format = winston.format.combine(
      winston.format.timestamp({ format: "DD MMM YYYY HH:mm:ss (Z)" })
    );
  return new NotificationTransport(options);
}
