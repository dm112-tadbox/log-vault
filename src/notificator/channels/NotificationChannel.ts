import { defaultJobOptions } from "./../../defaults/defaultJobOptions";
import { Job, Processor, Queue, RedisJobOptions, Worker } from "bullmq";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:stream";
import { InspectOptions } from "node:util";
import {
  NotificationChannelProcessOpts,
  NotificationChannelOptions,
  MatchPattern
} from "../../types";
import { defaultRedisConnection } from "../../defaults";

export class NotificationChannel extends EventEmitter {
  public matchPatterns: MatchPattern[];
  private queue?: Queue;
  private worker?: Worker;
  private processor: Processor = async (job: Job) => {
    this.emit("processed", job.data);
  };
  private jobOptions?: RedisJobOptions;
  protected inspectOptions?: InspectOptions;

  constructor(opts: NotificationChannelOptions = {}) {
    super();

    const { matchPatterns = [], inspectOptions = {} } = opts;

    this.matchPatterns = matchPatterns;

    this.inspectOptions = {
      depth: 3,
      maxArrayLength: 10,
      maxStringLength: 1024,
      ...inspectOptions
    };
  }

  protected process(opts: NotificationChannelProcessOpts): NotificationChannel {
    const {
      processor,
      workerOptions = {},
      queueName,
      queueOptions = {},
      jobOptions = {}
    } = opts;

    this.queue = new Queue(queueName, {
      connection: defaultRedisConnection,
      ...queueOptions
    });

    this.jobOptions = {
      ...defaultJobOptions,
      ...jobOptions
    };

    this.worker = new Worker(queueName, processor, {
      connection: defaultRedisConnection,
      ...workerOptions
    });

    return this;
  }

  public async addToQueue(log: any): Promise<void> {
    await this.queue?.add(randomUUID(), log, this.jobOptions);
  }

  public async stop() {
    await this.queue?.close();
  }
}
