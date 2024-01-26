import {
  Job,
  Processor,
  Queue,
  QueueOptions,
  RedisJobOptions,
  Worker,
  WorkerOptions
} from "bullmq";
import { redisDefault } from "../../defaults/connections";
import { randomUUID as uuid } from "node:crypto";
import {
  removeOnCompleteDefault,
  removeOnFailDefault
} from "../../defaults/jobs";
import { EventEmitter } from "node:stream";

export interface SearchPattern {
  [key: string]: string | RegExp;
}

export interface NotificationChannelOpts {
  patterns: SearchPattern[];
}

export interface NotificationChannelProcessOpts {
  processor: Processor;
  workerOptions?: Partial<WorkerOptions>;
  queueName: string;
  queueOptions?: Partial<QueueOptions>; // optional
  jobOptions?: RedisJobOptions; // optional
}

export class NotificationChannel extends EventEmitter {
  public patterns: SearchPattern[];
  private queue?: Queue;
  private worker?: Worker;
  private processor: Processor = async (job: Job) => {
    // console.warn("NotificationChannel class should not be in use directly");
    this.emit("processed", job.data);
  };
  private jobOptions?: RedisJobOptions;

  constructor({ patterns = [] }: NotificationChannelOpts) {
    super();
    this.patterns = patterns;
  }

  protected process(opts: NotificationChannelProcessOpts): NotificationChannel {
    const {
      processor,
      workerOptions = {},
      queueName,
      queueOptions = {},
      jobOptions = {}
    } = opts;

    if (!queueOptions.connection) queueOptions.connection = redisDefault;
    this.queue = new Queue(queueName, queueOptions as QueueOptions);

    this.jobOptions = {
      ...jobOptions,
      ...(!jobOptions.removeOnComplete && {
        removeOnComplete: removeOnCompleteDefault
      }),
      ...(!jobOptions.removeOnFail && {
        removeOnFail: removeOnFailDefault
      })
    };

    if (!workerOptions.connection) workerOptions.connection = redisDefault;
    this.worker = new Worker(
      queueName,
      processor,
      workerOptions as WorkerOptions
    );
    return this;
  }

  public async addToQueue(log: any): Promise<void> {
    await this.queue?.add(uuid(), log, this.jobOptions);
  }
}
