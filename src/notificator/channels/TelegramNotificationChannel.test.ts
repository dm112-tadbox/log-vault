import { waitForProcess } from "./NotificationChannel.test";
import { TelegramNotificationChannel } from "./TelegramNotificationChannel";

describe("TelegramNotificationChannel class", () => {
  it("TelegramNotificationChannel", async () => {
    const telegramChannel = new TelegramNotificationChannel({
      token: "6730607330:AAF932J_sLxO3rSinqRs6ehA5gGHtnvjc5s",
      chatId: 5814102063,
      patterns: []
    });

    telegramChannel.addToQueue({
      level: "error",
      message: "An error appear!",
      labels: {
        process: "some-service",
        environment: "test",
        project: "LogVault"
      }
    });
    const processed = await waitForProcess("test-token:1");

    expect(processed).toEqual("any message");
  });
});
