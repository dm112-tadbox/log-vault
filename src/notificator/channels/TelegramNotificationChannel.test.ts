import { Job } from "bullmq";
import { waitForProcess } from "./NotificationChannel.test";
import { TelegramNotificationChannel } from "./TelegramNotificationChannel";

describe("TelegramNotificationChannel class", () => {
  it("TelegramNotificationChannel", async () => {
    const telegramChannel = new TelegramNotificationChannel({
      queueName: "tg-test-channel",
      token: "test-token",
      chatId: 1,
      patterns: []
    }).process(async (job: Job) => job.data);

    telegramChannel.addToQueue("any message");
    const processed = await waitForProcess("tg-test-channel");

    expect(processed).toEqual("any message");
  });
});
