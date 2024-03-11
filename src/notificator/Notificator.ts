import { Job, Worker } from "bullmq";
import { defaultRedisConnection } from "../defaults";
import { NotificationChannel } from "./channels/NotificationChannel";
import { matchPattern } from "./util/matchPattern";
import { projectDirName } from "../util";
import { NotificatorConstructorOptions } from "../types";

export class Notificator {
  protected worker: Worker;
  protected channels: NotificationChannel[] = [];

  constructor(opts: NotificatorConstructorOptions = {}) {
    const { queueName = projectDirName(), workerOpts } = opts;

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const matchedChannels = matchPattern(job.data, this.channels);
        return Promise.all(matchedChannels.map((c) => c.addToQueue(job.data)));
      },
      {
        connection: defaultRedisConnection,
        autorun: true,
        ...workerOpts
      }
    );

    this.worker.on("error", (err) => {
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
