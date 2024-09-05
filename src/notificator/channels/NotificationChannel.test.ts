import { Job } from "bullmq";
import { NotificationChannel } from "./NotificationChannel";
import { NotificationChannelOptions } from "../../types";
import { waitForProcess } from "../../test-files/util/waitForProcess";
import { redisCleanup } from "../../test-files/util/redisCleanup";

describe("NotificationChannel class", () => {
  const queueName = "test-channel-queue";

  beforeEach(async () => {
    await redisCleanup(queueName);
  });

  afterEach(async () => {
    await redisCleanup(queueName);
  });

  it("main notification channel class", async () => {
    class TestChannel extends NotificationChannel {
      constructor(opts: NotificationChannelOptions) {
        super(opts);

        this.process({
          queueName,
          processor: async (job: Job) => job.data
        });
      }
    }

    const testChannel = new TestChannel({ matchPatterns: [] });

    testChannel.addToQueue("something");
    const res = await waitForProcess(queueName);
    expect(res).toEqual("something");
    await testChannel.stop();
  });
});
