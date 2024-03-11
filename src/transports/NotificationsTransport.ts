import { defaultRedisConnection } from "../defaults/defaultConnections";
import { defaultJobOptions } from "../defaults/defaultJobOptions";
import { Queue, RedisJobOptions } from "bullmq";
import { randomUUID } from "node:crypto";
import Transport from "winston-transport";
import {
  NotificationTransportOptions,
  NotificatonTransportLogItem
} from "../types";
import { projectDirName } from "../util";

export class NotificationsTransport extends Transport {
  queue: Queue;
  jobOptions: RedisJobOptions;

  constructor(options: NotificationTransportOptions = {}) {
    super(options);
    const { name = projectDirName(), queueOptions, jobOptions } = options;
    this.jobOptions = {
      ...defaultJobOptions,
      ...jobOptions
    };
    this.queue = new Queue(name, {
      connection: defaultRedisConnection,
      ...queueOptions
    });
  }

  async log(info: NotificatonTransportLogItem, callback: any) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    try {
      await this.queue.add(randomUUID(), info, this.jobOptions);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}
