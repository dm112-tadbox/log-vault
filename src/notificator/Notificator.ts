import { Job, Worker } from "bullmq";
import { EventEmitter } from "node:events";
import { defaultRedisConnection } from "../defaults";
import { NotificationChannel } from "./channels/NotificationChannel";
import { matchPattern } from "./util/matchPattern";
import { projectDirName } from "../util";
import { NotificatorConstructorOptions } from "../types";

export class Notificator extends EventEmitter {
  protected worker: Worker;
  protected channels: NotificationChannel[] = [];

  constructor(opts: NotificatorConstructorOptions = {}) {
    super();
    const { queueName = projectDirName(), workerOpts } = opts;

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const matchedChannels = matchPattern(job.data, this.channels);
        return await Promise.all(
          matchedChannels.map((c) => c.addToQueue(job.data))
        );
      },
      {
        connection: defaultRedisConnection,
        autorun: true,
        ...workerOpts
      }
    );

    this.worker.on("error", (err) => {
      process.stderr.write(`[Notificator] ${err}\n`);
    });
  }

  public run(): Notificator {
    this.worker.run();
    return this;
  }

  public async stop(): Promise<Notificator> {
    await this.worker.close();
    await Promise.all(this.channels.map((c) => c.stop()));
    return this;
  }

  public add(channel: NotificationChannel): Notificator {
    channel.on("failed", (job: Job, err: Error) => this.emit("failed", job, err));
    this.channels.push(channel);
    return this;
  }
}
