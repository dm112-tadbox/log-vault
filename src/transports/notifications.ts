import { inspectOptions as inspectOptionsDefault } from "./../defaults/inspectOptions";
import Transport from "winston-transport";
import { Queue, QueueOptions, RedisJobOptions } from "bullmq";
import { randomUUID as uuid } from "node:crypto";
import winston from "winston";
import { redisDefault } from "../defaults/connections";
import { removeOnCompleteDefault, removeOnFailDefault } from "../defaults/jobs";
import { Labels } from "../LogVault";
import { timestampDefault } from "../defaults/timestamp";
import { customInspect } from "../formats/customInspect";
import { InspectOptions } from "node:util";

export interface NotificationTransportOptions
  extends Transport.TransportStreamOptions {
  name?: string;
  opts?: QueueOptions;
  queueOptions?: QueueOptions;
  jobOptions?: RedisJobOptions;
  labels: Labels;
  inspectOptions?: InspectOptions;
}

class NotificationTransport extends Transport {
  queue: Queue;
  jobOptions: RedisJobOptions;
  labels: Labels;

  constructor(options: NotificationTransportOptions) {
    super(options);

    const { name, queueOptions, jobOptions, labels } = options;
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

    this.labels = labels;
  }

  async log(info: any, callback: any) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    if (!info.labels) info.labels = this.labels;

    try {
      await this.queue.add(uuid(), info, this.jobOptions);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export function getNotificationTransport(
  options: NotificationTransportOptions
) {
  if (options?.handleExceptions !== false) options.handleExceptions = true;
  if (options?.handleRejections !== false) options.handleRejections = true;
  if (!options?.format)
    options.format = winston.format.combine(
      winston.format.timestamp({ format: timestampDefault }),
      customInspect(options.inspectOptions || inspectOptionsDefault)
    );
  return new NotificationTransport(options);
}
