import LokiTransport from "winston-loki";
import { Level, LogVault, Notificator } from "./index";
import { readFileSync, rmSync } from "fs";
import { resolve } from "node:path";
import { MongoDB } from "winston-mongodb";
import { Console } from "winston/lib/winston/transports";
import stripColor from "strip-color";
import { TelegramNotificationChannel } from "./notificator/channels/TelegramNotificationChannel";

describe("console transport", () => {
  let output: any;
  let logger: LogVault | undefined;

  function getConsoleSpy(logger: LogVault) {
    const consoleTransport = getConsoleTransport(logger);
    return jest.spyOn(consoleTransport, "log").mockImplementation((data) => {
      const decolorized = stripColor(data[Symbol.for("message")]);
      const matched = decolorized.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\s(.*)$/s
      );
      if (!matched) throw new Error("No match found in output");
      output = matched[2];
    });
  }

  function getConsoleTransport(logger: LogVault) {
    const consoleTransport = logger.logger.transports.find(
      (t) => t instanceof Console
    );
    if (!consoleTransport)
      throw new Error("Couldn't assign the console transport");
    return consoleTransport;
  }

  beforeEach(() => {
    output = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (logger) {
      const consoleTransport = getConsoleTransport(logger);
      logger.logger.exceptions.unhandle(consoleTransport);
      logger.logger.rejections.unhandle(consoleTransport);
    }
    console.log = Object.getPrototypeOf(console).log;
  });

  it("logger log single string message", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);

    logger.log("Single string message");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info Single string message");
  });

  it("logger log several string messages", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);

    logger.log("First", "Second");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info First, Second");
  });

  it("logger log an object", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);

    logger.log({ foo: "bar" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info \n{\n  foo: 'bar'\n}");
  });

  it("logger log different entities", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);

    logger.log("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(
      "info this is an object:, \n{\n  some: 'data'\n},\n\n[\n  1,\n  2\n]"
    );
  });

  it("logger log circular object", () => {
    const circular: {
      b: any;
    } = {
      b: 2
    };
    circular.b = circular;

    logger = new LogVault();
    const spy = getConsoleSpy(logger);

    logger.log(circular);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info \n<ref *1> {\n  b: [Circular *1]\n}");
  });

  it("logger error", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);
    logger.error("Error");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("error Error");
  });

  it("logger warn", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);
    logger.warn("Warn");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("warn Warn");
  });

  it("logger info", () => {
    logger = new LogVault();
    const spy = getConsoleSpy(logger);
    logger.info("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info Data");
  });

  it("logger http", () => {
    logger = new LogVault({ maxLevel: Level.silly });
    const spy = getConsoleSpy(logger);
    logger.http("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("http Data");
  });

  it("logger debug", () => {
    logger = new LogVault({ maxLevel: Level.silly });
    const spy = getConsoleSpy(logger);
    logger.debug("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("debug Data");
  });

  it("logger silly", () => {
    const logger = new LogVault({ maxLevel: Level.silly });
    const spy = getConsoleSpy(logger);
    logger.silly("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("silly Data");
  });

  it("capture console log", () => {
    logger = new LogVault().captureConsole();
    const spy = getConsoleSpy(logger);
    console.log("console log");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info console log");
  });

  it("capture console info", () => {
    logger = new LogVault().captureConsole();
    const spy = getConsoleSpy(logger);
    console.info("console info");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info console info");
  });

  it("capture console warn", () => {
    logger = new LogVault().captureConsole();
    const spy = getConsoleSpy(logger);
    console.warn("console warn");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("warn console warn");
  });

  it("capture console error", () => {
    logger = new LogVault().captureConsole();
    const spy = getConsoleSpy(logger);
    console.error("console error");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("error console error");
  });

  it("capture console table", () => {
    logger = new LogVault().captureConsole();
    const spy = getConsoleSpy(logger);
    console.table([{ a: 1 }]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(`info 
┌─────────┬───┐
│ (index) │ a │
├─────────┼───┤
│    0    │ 1 │
└─────────┴───┘`);
  });
});

describe("files transport", () => {
  beforeEach(() => {
    rmSync(resolve("./", "logs"), { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(resolve("./", "logs"), { recursive: true, force: true });
  });

  it("log to file", async () => {
    const logger = new LogVault({ noConsole: true }).withFiles();

    logger.log("This is a test");

    const circular: { a: string; content: string | object } = {
      a: "b",
      content: ""
    };
    circular.content = circular;
    logger.warn(circular);

    await wait(50);

    const logFileName = getLogFileName(Level.info);
    const content = readFileSync(resolve("./logs", logFileName), {
      encoding: "utf-8"
    });

    const parsed = parseFileContent(content);

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            environment: "test",
            process: "log-vault",
            project: "log-vault"
          },
          level: "info",
          message: ["This is a test"],
          timestamp: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
          )
        }),
        expect.objectContaining({
          labels: {
            environment: "test",
            process: "log-vault",
            project: "log-vault"
          },
          level: "warn",
          message: [
            {
              a: circular.a,
              content: "[Circular]"
            }
          ],
          timestamp: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
          )
        })
      ])
    );
  });

  it("log error to a file", async () => {
    const logger = new LogVault({ noConsole: true }).withFiles();

    logger.error("Whoops!");

    await wait(50);

    const logFileName = getLogFileName(Level.error);
    const content = readFileSync(resolve("./logs", logFileName), {
      encoding: "utf-8"
    });

    const parsed = parseFileContent(content);

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          message: ["Whoops!"],
          timestamp: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
          )
        })
      ])
    );
  });

  function parseFileContent(content: string): object {
    let str = "[" + content.replaceAll(/\n}\n{/g, "\n},\n{");
    str = str.slice(0, -1) + "]";
    return JSON.parse(str);
  }

  function getLogFileName(level: Level): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts();
    return `${level}-${parts[4].value}-${parts[0].value}-${parts[2].value}.log`;
  }
});

describe("loki transport", () => {
  let output: any;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("log to loki", async () => {
    const logger = new LogVault({ noConsole: true }).withLoki();

    const loki = logger.logger.transports.find(
      (t) => t instanceof LokiTransport
    );
    if (!loki) throw new Error("Couldn't assign Loki transport");

    const spy = jest.spyOn(loki, "log").mockImplementation((data) => {
      output = data;
    });

    logger.log("Log record");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output.level).toEqual("info");
    expect(output.message).toEqual("Log record");
    expect(output.labels).toEqual({
      project: "log-vault",
      process: "log-vault",
      environment: "test"
    });
  });
});

describe("mongo transport", () => {
  it("log to mongo", async () => {
    const logger = new LogVault({ noConsole: true }).withMongo({
      db: "mongodb+srv://usr:pwd@cluster0.c9lvsrg.mongodb.net/?retryWrites=true&w=majority"
    });

    let output: any = "";

    const mongo = logger.logger.transports.find((t) => t instanceof MongoDB);
    if (!mongo) throw new Error("Failed to instantiate Mongo connection");
    const spy = jest.spyOn(mongo, "log").mockImplementation((data) => {
      output = data;
    });

    logger.log("Hi Mongo");

    logger.logger.remove(mongo);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output.level).toEqual("info");
    expect(output.message).toEqual(["Hi Mongo"]);
    expect(output.labels).toEqual({
      project: "log-vault",
      process: "log-vault",
      environment: "test"
    });
  });
});

describe("notifications transport", () => {
  it("send log to notification channel", async () => {
    const logger = new LogVault({ noConsole: true }).withNotifications({
      jobOptions: {
        removeOnComplete: {
          age: 60 * 5, // seconds
          count: 10 // up to count of jobs
        }
      },
      name: "log-vault-test"
    });
    logger.log("New notification");
    logger.log("New notification");
    logger.log("New notification");

    /* const notificator = new Notificator({
      workerOpts: { limiter: { max: 1, duration: 300 } }
    }); */
    const notificator = new Notificator({
      queueName: "log-vault-test",
      workerOpts: {
        limiter: {
          max: 1,
          duration: 300
        }
      }
    });
    notificator.add(
      new TelegramNotificationChannel({
        queueName: "telegram-errors",
        patterns: [{ level: "error" }],
        token: "my_token",
        chatId: 11111
      })
    );
    notificator.run();
    await wait(4000);
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}
