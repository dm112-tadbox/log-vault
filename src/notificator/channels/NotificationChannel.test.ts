import { Job } from "bullmq";
import { NotificationChannel } from "./NotificationChannel";
import { NotificationChannelOptions } from "../../types";
import { waitForProcess } from "../../test-files/util/waitForProcess";

describe("NotificationChannel class", () => {
  it("main notification channel class", async () => {
    class TestChannel extends NotificationChannel {
      constructor(opts: NotificationChannelOptions) {
        super(opts);

        this.process({
          queueName: "test-channel-queue",
          processor: async (job: Job) => job.data
        });
      }
    }

    const testChannel = new TestChannel({ matchPatterns: [] });

    testChannel.addToQueue("something");
    const res = await waitForProcess("test-channel-queue");
    expect(res).toEqual("something");
    await testChannel.stop();
  });
});
