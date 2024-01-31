import { Job, Worker, WorkerOptions } from "bullmq";
import { redisDefault } from "../defaults/connections";
import { NotificationChannel } from "./channels/NotificationChannel";
import { matchPattern } from "./matchPattern";

export interface NotificatorConstructorOptions {
  queueName?: string;
  workerOpts?: Partial<WorkerOptions>;
}

export class Notificator {
  protected worker: Worker;
  protected channels: NotificationChannel[] = [];

  constructor(opts?: NotificatorConstructorOptions) {
    const { queueName = "log-vault", workerOpts } = opts || {};

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const matchedChannels = matchPattern(job.data, this.channels);

        return Promise.all(matchedChannels.map((c) => c.addToQueue(job.data)));
      },
      {
        ...workerOpts,
        connection: workerOpts?.connection || redisDefault,
        autorun: !!workerOpts?.autorun
      }
    );

    this.worker.on("error", (err) => {
      // log the error
      console.error(err);
    });
  }

  public run(): Notificator {
    this.worker.run();
    return this;
  }

  public async stop(): Promise<Notificator> {
    await this.worker.close();
    return this;
  }

  public add(channel: NotificationChannel): Notificator {
    this.channels.push(channel);
    return this;
  }
}
