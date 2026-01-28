import { Job, Queue } from "bullmq";
import { Notificator } from "./Notificator";
import { NotificationChannel } from "./channels/NotificationChannel";
import { waitForProcess } from "../test-files/util/waitForProcess";
import { NotificationChannelOptions } from "../types";

describe("Notificator class tests", () => {
  it("Notificator class", async () => {
    const notificator = new Notificator({
      queueName: "test-notificator-queue"
    });
    class TestChannel extends NotificationChannel {
      constructor(opts: NotificationChannelOptions) {
        super(opts);
        this.process({
          queueName: "test-nchannel-queue",
          processor: async (job: Job) => {
            return job.data;
          }
        });
      }
    }

    const testChannel = new TestChannel({ matchPatterns: [] });
    notificator.add(testChannel);

    const testQueue = new Queue("test-notificator-queue");

    // Await setup to ensure listener is ready before adding job
    const { completed } = await waitForProcess("test-nchannel-queue");

    testQueue.add("new-event", {
      data: "test-data"
    });

    const processed = await completed;
    expect(processed).toEqual({
      data: "test-data"
    });

    await notificator.stop();
  });
});
