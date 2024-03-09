import { MatchPattern } from "./types";
import bodyParser from "body-parser";
import express from "express";
import { Logger } from "winston";
import { LogVault, Notificator, TelegramNotificationChannel } from ".";
import { waitForProcess } from "./notificator/channels/NotificationChannel.test";
import { wait } from "./LogVault.test";

const testToken = "testToken";
const testChatId = 1;

describe("e2e tests: LogVault with Notificator", () => {
  let tgRequestBody: any;
  let mockServer: any;
  const mockPort = 7625;
  let notificator: Notificator;
  let logger: Logger;
  let logVault: LogVault;
  let timestamp: string;

  beforeEach(async () => {
    await startMockServer();
  });

  afterEach(() => {
    tgRequestBody = undefined;
    notificator.stop();
    mockServer.close();
    jest.clearAllMocks();
  });

  it("send notification to Telegram, matched by level", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });

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

  it("send notification to Telegram, mismatch by level", async () => {
    initTest({ matchPatterns: [{ level: "http" }] });
    logger.info("should not be notified");
    await wait(350);
    expect(tgRequestBody).toBe(undefined);
  });

  function initTest(opts: { matchPatterns: MatchPattern[] }) {
    const { matchPatterns = [] } = opts;
    notificator = new Notificator({
      workerOpts: {
        limiter: {
          max: 1,
          duration: 300
        }
      }
    });
    notificator.add(
      new TelegramNotificationChannel({
        host: `http://localhost:${mockPort}`,
        token: testToken,
        chatId: testChatId,
        matchPatterns,
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
        tgRequestBody = req.body;
        return res.status(200).end();
      });
      mockServer = app.listen(mockPort, () => resolve(true));
    });
  }

  async function waitForProcessTest() {
    const processed = await waitForProcess(`${testToken}:${testChatId}`);
    timestamp = processed.timestamp.replace(
      /([|{[\]*_~}+)(#>!=\-.])/gm,
      "\\$1"
    );
    return processed;
  }
});
