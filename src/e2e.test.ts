import { MatchPattern } from "./types";
import bodyParser from "body-parser";
import express from "express";
import { Logger } from "winston";
import { Queue, RedisJobOptions } from "bullmq";
import { LogVault, Notificator, TelegramNotificationChannel } from ".";
import { defaultRedisConnection } from "./defaults";
import { waitForProcess } from "./test-files/util/waitForProcess";
import { wait } from "./test-files/util/wait";

const testToken = "testToken";
const testChatId = 1;

describe("e2e tests: LogVault with Notificator", () => {
  let tgRequestBody: any;
  let tgShouldFail = false;
  let mockServer: any;
  const mockPort = 7625;
  let notificator: Notificator;
  let logger: Logger;
  let logVault: LogVault;
  let timestamp: string;

  beforeAll(async () => {
    // Clean queues from any state left by other test files or previous runs
    const projectQueue = new Queue("log-vault", {
      connection: defaultRedisConnection
    });
    const channelQueue = new Queue(`${testToken}.${testChatId}`, {
      connection: defaultRedisConnection
    });
    await Promise.all([
      projectQueue.obliterate({ force: true }),
      channelQueue.obliterate({ force: true })
    ]);
    await Promise.all([projectQueue.close(), channelQueue.close()]);
    await startMockServer();
  });

  afterAll(async () => {
    await mockServer.close();
  });

  beforeEach(() => {
    // channel queue is cleaned by afterEach → channel.stop(); no per-test obliterate
    // to avoid disrupting the BullMQ events stream that QueueEvents subscribes to
  });

  afterEach(async () => {
    tgRequestBody = undefined;
    tgShouldFail = false;
    await notificator.stop();
    jest.clearAllMocks();
  });

  it("e2e:send notification to Telegram, matched by level", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    await setupQueueListener();

    logger.http("something");
    await waitForProcessTest();
    expect(tgRequestBody).toEqual({
      chat_id: 1,
      text:
        `🔵 *http log message* ⏱ _${timestamp}_\n` +
        "\n" +
        "`[project]: log\\-vault`\n" +
        "`[process]: log\\-vault`\n" +
        "`[environment]: test`\n" +
        "\n" +
        "```json\n" +
        '"something"\n' +
        "```",
      parse_mode: "MarkdownV2"
    });
  });

  it("e2e:send notification to Telegram, mismatch by level", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    await setupQueueListener();
    logger.info("should not be notified");
    await wait(350);
    expect(tgRequestBody).toBe(undefined);
  });

  it("e2e:send notification to Telegram, matched by message, nested", async () => {
    initTest({ matchPatterns: [{ match: { message: /error/gi } }] });
    await setupQueueListener();
    logger.http({
      message: "Request failed",
      details: {
        request: {
          headers: {
            header1: "header data"
          },
          body: {
            some: "data"
          }
        },
        response: {
          responseData: "Error! Wrong request"
        }
      }
    });
    await waitForProcessTest();
    expect(tgRequestBody).toEqual({
      chat_id: 1,
      text:
        `🔵 *http log message* ⏱ _${timestamp}_\n` +
        "\n" +
        "`[project]: log\\-vault`\n" +
        "`[process]: log\\-vault`\n" +
        "`[environment]: test`\n" +
        "\n" +
        "```json\n" +
        "\\[\n" +
        '  "Request failed",\n' +
        "  \\{\n" +
        '    "details": \\{\n' +
        '      "request": \\{\n' +
        '        "headers": \\{\n' +
        '          "header1": "header data"\n' +
        "        \\},\n" +
        '        "body": \\{\n' +
        '          "some": "data"\n' +
        "        \\}\n" +
        "      \\},\n" +
        '      "response": \\{\n' +
        '        "responseData": "Error\\! Wrong request"\n' +
        "      \\}\n" +
        "    \\}\n" +
        "  \\}\n" +
        "\\]\n" +
        "```",
      parse_mode: "MarkdownV2"
    });
  });

  it("e2e:send notification to Telegram, matched by message, nested, with exclusion pattern", async () => {
    initTest({
      matchPatterns: [
        {
          level: "http",
          match: { message: /error/gi },
          exclude: { message: /bot\sping/gi }
        }
      ]
    });
    await setupQueueListener();
    logger.http({
      message: "Request failed",
      details: {
        request: {
          headers: {
            header1: "header data"
          },
          body: {
            some: "data"
          }
        },
        response: {
          responseData: "Error! Wrong request"
        }
      }
    });
    await waitForProcessTest();
    expect(tgRequestBody).toEqual({
      chat_id: 1,
      text:
        `🔵 *http log message* ⏱ _${timestamp}_\n` +
        "\n" +
        "`[project]: log\\-vault`\n" +
        "`[process]: log\\-vault`\n" +
        "`[environment]: test`\n" +
        "\n" +
        "```json\n" +
        "\\[\n" +
        '  "Request failed",\n' +
        "  \\{\n" +
        '    "details": \\{\n' +
        '      "request": \\{\n' +
        '        "headers": \\{\n' +
        '          "header1": "header data"\n' +
        "        \\},\n" +
        '        "body": \\{\n' +
        '          "some": "data"\n' +
        "        \\}\n" +
        "      \\},\n" +
        '      "response": \\{\n' +
        '        "responseData": "Error\\! Wrong request"\n' +
        "      \\}\n" +
        "    \\}\n" +
        "  \\}\n" +
        "\\]\n" +
        "```",
      parse_mode: "MarkdownV2"
    });
  });

  it("e2e: does not loop with circular reference in log data", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    await setupQueueListener();
    const circular: any = { message: "circular test" };
    circular.self = circular;
    logger.http(circular);
    const processed = await completedPromise;
    expect(processed).toBeDefined(); // job completed, no infinite loop
  });

  it("e2e: does not loop with BigInt in log data", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    logger.http({ message: "bigint test", value: BigInt(42) });
    await wait(500);
    expect(tgRequestBody).toBeUndefined();
  });

  it("e2e: does not loop when message is undefined", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    await setupQueueListener();
    logger.http({ message: undefined } as any);
    const processed = await completedPromise;
    expect(processed).toBeDefined(); // job completed, no infinite loop
  });

  it("e2e: captureConsole does not loop when notification processing fails with undefined message", async () => {
    const originalConsoleError = console.error;
    try {
      initTest({ matchPatterns: [{ level: "http" }] });
      logVault.captureConsole();
      await setupQueueListener();
      logger.http({ message: undefined } as any);
      const processed = await completedPromise;
      expect(processed).toBeDefined(); // job completed, no infinite loop
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("e2e: handles Telegram API failure gracefully", async () => {
    initTest({ matchPatterns: [{ level: "error" }], jobOptions: { attempts: 1 } });
    tgShouldFail = true;
    const { failed } = await waitForProcess(`${testToken}.${testChatId}`);
    logger.error("test error - telegram will fail");
    const failedReason = await failed;
    expect(failedReason).toBeDefined();
    expect(tgRequestBody).toBeUndefined();
  });

  it("e2e: does not loop when Telegram API fails with captureConsole active", async () => {
    const originalConsoleError = console.error;
    try {
      initTest({ matchPatterns: [{ level: "error" }] });
      tgShouldFail = true;
      logVault.captureConsole();
      const errorSpy = jest.spyOn(logger, "error");
      logger.error("test error - should not loop");
      await wait(1000);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("e2e: withNotificator logs final failure through logger without looping", async () => {
    initTest({ matchPatterns: [{ level: "error" }], jobOptions: { attempts: 1 } });
    logVault.withNotificator(notificator);
    tgShouldFail = true;
    const errorSpy = jest.spyOn(logger, "error");
    const { failed } = await waitForProcess(`${testToken}.${testChatId}`);
    logger.error("test error");
    await failed;
    await wait(100);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenLastCalledWith(
      "Notification delivery failed",
      expect.objectContaining({ payload: expect.any(Object) })
    );
  });

  it("e2e: processes normal data correctly after non-serializable data", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    const circular: any = {};
    circular.self = circular;
    logger.http(circular);
    await wait(100);
    await setupQueueListener();
    logger.http("recovery message");
    await waitForProcessTest();
    expect(tgRequestBody).toEqual(
      expect.objectContaining({ chat_id: 1, parse_mode: "MarkdownV2" })
    );
  });

  it("e2e:send notification to Telegram, matched by message, nested, with exclusion pattern, exclusion matched", async () => {
    initTest({
      matchPatterns: [
        { match: { message: /error/gi }, exclude: { message: /bot\sping/gi } }
      ]
    });
    logger.http({
      message: "Request failed",
      details: {
        request: {
          headers: {
            header1: "header data",
            identification: "Bot ping"
          },
          body: {
            some: "data"
          }
        },
        response: {
          responseData: "Error! Wrong request"
        }
      }
    });
    await wait(350);
    expect(tgRequestBody).toBe(undefined);
  });

  let completedPromise: Promise<any>;

  async function setupQueueListener() {
    const { completed } = await waitForProcess(`${testToken}.${testChatId}`);
    completedPromise = completed;
  }

  function initTest(opts: {
    matchPatterns: MatchPattern[];
    telegramHost?: string;
    jobOptions?: Partial<RedisJobOptions>;
  }) {
    const {
      matchPatterns = [],
      telegramHost = `http://localhost:${mockPort}`,
      jobOptions = {}
    } = opts;

    notificator = new Notificator({
      workerOpts: {
        limiter: {
          max: 1,
          duration: 30
        }
      }
    });
    notificator.add(
      new TelegramNotificationChannel({
        host: telegramHost,
        token: testToken,
        chatId: testChatId,
        matchPatterns,
        jobOptions,
        workerOptions: {
          limiter: {
            max: 1,
            duration: 10
          }
        }
      })
    );

    logVault = new LogVault().withNotifications();
    logger = logVault.logger;
  }

  function startMockServer() {
    return new Promise((resolve) => {
      const app = express();
      app.use(bodyParser.json());
      app.post("/*/sendMessage", (req, res): express.Response => {
        if (tgShouldFail) return res.status(500).end();
        tgRequestBody = req.body;
        return res.status(200).end();
      });
      mockServer = app.listen(mockPort, () => resolve(true));
    });
  }

  async function waitForProcessTest() {
    const processed = await completedPromise;
    timestamp = processed.timestamp.replace(
      /([|{[\]*_~}+)(#>!=\-.])/gm,
      "\\$1"
    );
    return processed;
  }
});
