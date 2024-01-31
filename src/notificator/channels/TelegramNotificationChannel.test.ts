import express from "express";
import { waitForProcess } from "./NotificationChannel.test";
import { TelegramNotificationChannel } from "./TelegramNotificationChannel";
import { Server, IncomingMessage, ServerResponse } from "http";
import bodyParser from "body-parser";

let mockServer: Server<typeof IncomingMessage, typeof ServerResponse>;
const mockPort = 2654;
let tgRequestBody: any;

describe("TelegramNotificationChannel class", () => {
  beforeEach(async () => {
    await startMockServer();
  });

  afterEach(async () => {
    mockServer.close();
  });

  it("TelegramNotificationChannel", async () => {
    const telegramChannel = new TelegramNotificationChannel({
      host: `http://localhost:${mockPort}`,
      token: "unittesttoken",
      chatId: 1,
      patterns: []
    });

    telegramChannel.addToQueue({
      timestamp: "2024-01-30T11:47:03.633Z",
      level: "error",
      message: "An error appear!",
      labels: {
        process: "some-service",
        environment: "test",
        project: "LogVault"
      }
    });
    const processed = await waitForProcess("unittesttoken:1");

    expect(processed).toEqual({
      labels: {
        environment: "test",
        process: "some-service",
        project: "LogVault"
      },
      level: "error",
      message: "An error appear!",
      timestamp: "2024-01-30T11:47:03.633Z"
    });

    expect(tgRequestBody).toEqual({
      chat_id: 1,
      text:
        "🔴 *error log message*\n" +
        "\n" +
        "⏱ _2024\\-01\\-30T11:47:03\\.633Z_\n" +
        "*project*: LogVault\n" +
        "*environment*: test\n" +
        "*process*: some\\-service\n" +
        "\n" +
        "```json\n" +
        "'An error appear!'\n" +
        "```\n",
      parse_mode: "MarkdownV2"
    });
  });
});

function startMockServer() {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    app.post("/*/sendMessage", (req, res): express.Response => {
      tgRequestBody = req.body;
      return res.status(200).end();
    });
    mockServer = app.listen(mockPort, () => resolve(true));
  });
}
