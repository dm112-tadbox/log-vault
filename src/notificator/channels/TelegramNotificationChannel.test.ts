import express from "express";
import { waitForProcess } from "../../test-files/util/waitForProcess";
import { Server, IncomingMessage, ServerResponse } from "http";
import bodyParser from "body-parser";
import { TelegramNotificationChannel } from "./TelegramNotificationChannel";
import { redisCleanup } from "../../test-files/util/redisCleanup";

let mockServer: Server<typeof IncomingMessage, typeof ServerResponse>;
const mockPort = 2654;
let tgRequestBody: any;

describe("TelegramNotificationChannel class", () => {
  let telegramChannel: TelegramNotificationChannel;

  beforeAll(async () => {
    telegramChannel = new TelegramNotificationChannel({
      host: `http://localhost:${mockPort}`,
      token: "111111:HJKFGJKGjhgjhg",
      chatId: 1,
      matchPatterns: [],
      workerOptions: {
        limiter: {
          max: 1,
          duration: 10
        }
      }
    });
    await redisCleanup(telegramChannel.queueName);
    await startMockServer();
  });

  afterAll(async () => {
    await redisCleanup(telegramChannel.queueName);
    await stopMockServer(mockServer);
  });

  it("TelegramNotificationChannel", async () => {
    // Set up listener BEFORE adding job to avoid race condition
    const { completed } = await waitForProcess(telegramChannel.queueName);

    await telegramChannel.addToQueue({
      timestamp: "2024-01-30T11:47:03.633Z",
      level: "error",
      message: "An error appear!",
      meta: {
        process: "some-service",
        environment: "test",
        project: "LogVault"
      }
    });

    const processed = await completed;

    expect(processed).toEqual({
      meta: {
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
        "🔴 *error log message* ⏱ _2024\\-01\\-30T11:47:03\\.633Z_\n" +
        "\n" +
        "`[process]: some\\-service`\n" +
        "`[environment]: test`\n" +
        "`[project]: LogVault`\n" +
        "\n" +
        "```json\n" +
        '"An error appear\\!"\n' +
        "```",
      parse_mode: "MarkdownV2"
    });

    await telegramChannel.stop();
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
    mockServer.on("error", (e: any) => {
      throw new Error(e);
    });
  });
}

function stopMockServer(
  mockServer: Server<typeof IncomingMessage, typeof ServerResponse>
) {
  return new Promise((resolve, reject) => {
    mockServer.close((err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}
