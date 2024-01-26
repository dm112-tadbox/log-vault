import { Job, QueueEvents } from "bullmq";
import {
  NotificationChannel,
  NotificationChannelOpts
} from "./NotificationChannel";

describe("NotificationChannel class", () => {
  it("notification channel", async () => {
    class TestChannel extends NotificationChannel {
      constructor(opts: NotificationChannelOpts) {
        super(opts);

        this.process({
          queueName: "test-channel-queue",
          processor: async (job: Job) => job.data
        });
      }
    }

    const testChannel = new TestChannel({ patterns: [] });

    testChannel.addToQueue("something");
    const res = await waitForProcess("test-notification-channel");
    expect(res).toEqual("something");
  });
});

export function waitForProcess(queueName: string): Promise<any> {
  return new Promise((resolve) => {
    const queueEvents = new QueueEvents(queueName);
    queueEvents.on("completed", ({ returnvalue }) => resolve(returnvalue));
  });
}
