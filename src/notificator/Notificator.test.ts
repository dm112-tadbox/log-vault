import { Job, Queue } from "bullmq";
import { Notificator } from "./Notificator";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./channels/NotificationChannel";
import { waitForProcess } from "./channels/NotificationChannel.test";

describe("Notificator class tests", () => {
  it("Notificator class", async () => {
    const notificator = new Notificator({
      queueName: "test-notificator-queue"
    });
    class TestChannel extends NotificationChannel {
      constructor(opts: NotificationChannelOpts) {
        super(opts);
        this.process({
          queueName: "test-channel-queue",
          processor: async (job: Job) => {
            return job.data;
          }
        });
      }
    }

    const testChannel = new TestChannel({ patterns: [] });
    notificator.add(testChannel);
    notificator.run();

    const testQueue = new Queue("test-notificator-queue");

    testQueue.add("new-event", {
      data: "test-data"
    });

    const processed = await waitForProcess("test-channel-queue");
    expect(processed).toEqual({
      data: "test-data"
    });

    await notificator.stop();
  });
});
