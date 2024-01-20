import LokiTransport from "winston-loki";
import { Level, LogVault } from "./index";
import { readFileSync, rmSync } from "fs";
import { resolve } from "node:path";
import { MongoDB } from "winston-mongodb";
import { Console } from "winston/lib/winston/transports";
import sliceAnsi from "strip-color";

let output = "";

describe("console transport", () => {
  beforeEach(() => {
    // consoleCaptureStart();
  });

  afterEach(() => {
    // consoleCaptureEnd();
  });

  it("logging with console", async () => {
    const logger = new LogVault();

    const consoleTransport = logger.logger.transports.find(
      (t) => t instanceof Console
    );
    if (!consoleTransport)
      throw new Error("Couldn't assign the console transport");

    const spy = jest
      .spyOn(consoleTransport, "log")
      .mockImplementation((str) => {
        str[Symbol.for("message")] = sliceAnsi(str[Symbol.for("message")]);
        output = str;
      });

    logger.log("HTTP log message");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      level: "\x1B[32m\x1B[1minfo\x1B[22m\x1B[39m",
      message: ["HTTP log message"],
      labels: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: expect.stringMatching(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
      ),
      [Symbol.for("level")]: "info",
      [Symbol.for("message")]: expect.stringMatching(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\sinfo\sHTTP\slog\smessage/g
      )
    });
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
      a: "b\n1",
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
          level: "info",
          message: ["This is a test"],
          timestamp: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
          )
        }),
        expect.objectContaining({
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
    const str = "[" + content.replace("}\n{", "},\n{") + "]";
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("log to loki", async () => {
    const logger = new LogVault({ noConsole: true }).withLoki();

    const loki = logger.logger.transports.find(
      (t) => t instanceof LokiTransport
    );
    if (!loki) throw new Error("Couldn't assign Loki transport");

    const spy = jest.spyOn(loki, "log");

    logger.log("Log record");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        level: "info",
        message: ["Log record"],
        timestamp: expect.stringMatching(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/
        ),
        labels: {
          project: "log-vault",
          process: "log-vault",
          environment: "test"
        },
        [Symbol.for("level")]: "info",
        [Symbol.for("message")]: "[\n  'Log record'\n]"
      },
      expect.any(Function)
    );
  });
});

describe("mongo transport", () => {
  it("log to mongo", async () => {
    const logger = new LogVault({ noConsole: true }).withMongo({
      db: "mongodb+srv://usr:pwd@cluster0.c9lvsrg.mongodb.net/?retryWrites=true&w=majority",
      test: true
    });

    let output = "";

    const mongo = logger.logger.transports.find((t) => t instanceof MongoDB);
    if (!mongo) throw new Error("Failed to instantiate Mongo connection");
    const spy = jest.spyOn(mongo, "log").mockImplementation((data) => {
      output = data;
    });

    logger.log("Hi Mongo");

    logger.logger.remove(mongo);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      level: "info",
      message: ["Hi Mongo"],
      labels: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      [Symbol.for("level")]: "info",
      [Symbol.for("message")]:
        '{"labels":{"environment":"test","process":"log-vault","project":"log-vault"},"level":"info","message":["Hi Mongo"]}'
    });
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}
