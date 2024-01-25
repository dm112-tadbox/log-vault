import { Job, QueueEvents } from "bullmq";
import { NotificationChannel } from "./NotificationChannel";

describe("NotificationChannel class", () => {
  it("notification channel", async () => {
    const channel = new NotificationChannel({
      queueName: "test-notification-channel",
      patterns: []
    }).process(async (job: Job) => job.data);

    channel.addToQueue("something");
    const res = await waitForProcess("test-notification-channel");
    expect(res).toEqual("something");
  });
});

export function waitForProcess(queueName: string): Promise<any> {
  return new Promise((resolve) => {
    // channel.on("processed", (data) => resolve(data));
    const queueEvents = new QueueEvents(queueName);
    queueEvents.on("completed", ({ returnvalue }) => resolve(returnvalue));
  });
}
