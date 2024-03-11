import stripColor from "strip-color";
import { Logger } from "winston";
import { Console, DailyRotateFile } from "winston/lib/winston/transports";
import { LogVault } from "./LogVault";
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { defaultTimestampRegexp } from "./defaults";
import TransportStream from "winston-transport";
import { LogOptions, MESSAGE } from ".";
import { MongoDB } from "winston-mongodb";
import LokiTransport from "winston-loki";
import { NotificationsTransport } from "./transports";
import { wait } from "./test-files/util/wait";

describe("console transport: logging", () => {
  let output: any;
  let logger: Logger | undefined;

  beforeEach(() => {
    output = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (logger) {
      const consoleTransport = getConsoleTransport(logger);
      logger.exceptions.unhandle(consoleTransport);
      logger.rejections.unhandle(consoleTransport);
      process.removeAllListeners("uncaughtException");
      process.removeAllListeners("unhandledRejection");
    }
  });

  it("logger.info single string", () => {
    const { logger } = new LogVault().withConsole();
    const spy = getConsoleSpy(logger);
    logger.info("A log message");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: A log message");
  });

  it("logger.log single string", () => {
    const { logger } = new LogVault().withConsole();
    const spy = getConsoleSpy(logger);
    logger.log({ level: "warn", message: "A log message" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("warn: A log message");
  });

  it("logger.info several string messages", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);

    logger.info("First", "Second");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: First\n[\n  'Second'\n]");
  });

  it("logger.log several string messages", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);

    logger.log({ level: "info", message: "First", extra: "second" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: First\n[\n  {\n    extra: 'second'\n  }\n]");
  });

  it("logger.info an object", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);

    logger.info({ foo: "bar" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: {\n  foo: 'bar'\n}");
  });

  it("logger.info different entities", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);

    logger.info("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(
      "info: this is an object:\n[\n  {\n    some: 'data'\n  },\n  [\n    1,\n    2\n  ]\n]"
    );
  });

  it("logger.info circular object", () => {
    const circular: {
      b: any;
    } = {
      b: 2
    };
    circular.b = circular;

    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);

    logger.info(circular);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: {\n  b: '...[Truncated]'\n}");
  });

  it("logger error", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.error("Error");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("error: Error");
  });

  it("logger warn", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.warn("Warn");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("warn: Warn");
  });

  it("logger info", () => {
    const logVault = new LogVault().withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.info("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("info: Data");
  });

  it("logger http", () => {
    const logVault = new LogVault({ level: "silly" }).withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.http("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("http: Data");
  });

  it("logger debug", () => {
    const logVault = new LogVault({ level: "silly" }).withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.debug("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("debug: Data");
  });

  it("logger silly", () => {
    const logVault = new LogVault({ level: "silly" }).withConsole();
    logger = logVault.logger;
    const spy = getConsoleSpy(logger);
    logger.silly("Data");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual("silly: Data");
  });

  it("console: mask sensitive field: password", () => {
    const { logger } = new LogVault().withConsole();
    const spy = getConsoleSpy(logger);
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(
      "info: {\n  user: 'username',\n  password: '...[Masked]'\n}"
    );
  });

  it("console: do not mask any field", () => {
    const { logger } = new LogVault({
      maskOptions: { fields: [] }
    }).withConsole();
    const spy = getConsoleSpy(logger);
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(
      "info: {\n  user: 'username',\n  password: 'P@ssw0rd'\n}"
    );
  });

  it("console: mask values in extra object", () => {
    const logVault = new LogVault().withConsole();
    const { logger } = logVault;
    const spy = getConsoleSpy(logger);
    logger.http("An error occured", {
      request: {
        headers: {
          "content-type": "application/json"
        },
        body: {
          login: "sdjkjasdh",
          password: "P@ssw0rd"
        }
      },
      response: {
        header: {
          id: null,
          status: "ERROR"
        },
        error: {
          code: "INPDATAFORMAT",
          message: "Input data format is incorrect"
        }
      }
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual(
      "http: An error occured\n" +
        "[\n" +
        "  {\n" +
        "    request: {\n" +
        "      headers: {\n" +
        "        'content-type': 'application/json'\n" +
        "      },\n" +
        "      body: {\n" +
        "        login: 'sdjkjasdh',\n" +
        "        password: '...[Masked]'\n" +
        "      }\n" +
        "    },\n" +
        "    response: {\n" +
        "      header: {\n" +
        "        id: null,\n" +
        "        status: 'ERROR'\n" +
        "      },\n" +
        "      error: {\n" +
        "        code: 'INPDATAFORMAT',\n" +
        "        message: 'Input data format is incorrect'\n" +
        "      }\n" +
        "    }\n" +
        "  }\n" +
        "]"
    );
  });

  it("capture console: log a single string", () => {
    const logVault = new LogVault().withConsole().captureConsole();
    const { logger } = logVault;
    const spy = getConsoleSpy(logger);
    console.log("logging with console.log");
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual("info: logging with console.log");
  });

  it("capture console: log different entities", () => {
    const logVault = new LogVault().withConsole().captureConsole();
    const { logger } = logVault;
    const spy = getConsoleSpy(logger);
    console.log("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual(
      "info: this is an object:\n[\n  {\n    some: 'data'\n  },\n  [\n    1,\n    2\n  ]\n]"
    );
  });

  function getConsoleTransport(logger: Logger) {
    const consoleTransport = logger.transports.find(
      (t) => t instanceof Console
    );
    if (!consoleTransport)
      throw new Error("Couldn't assign the console transport");
    return consoleTransport;
  }

  function getConsoleSpy(logger: Logger) {
    const consoleTransport = getConsoleTransport(logger);
    return jest.spyOn(consoleTransport, "log").mockImplementation((data) => {
      const decolorized = stripColor(data[Symbol.for("message")]);
      const matched = decolorized.match(
        /^\d{2}\s[A-z]{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\s\([+-]*\d{2}:\d{2}\)\s(.*)$/s
      );
      if (!matched) throw new Error("No match found in output");
      output = matched[1];
    });
  }
});

describe("console transport:catching exceptions and rejections", () => {
  it("catch a simple exception with console", () => {
    const buf = execSync("ts-node ./src/test-files/textError.ts");
    const out = formatOutput(buf);
    expect(out).toEqual({
      name: "Error",
      message: "An error occur",
      stack: expect.stringMatching(/Error:\sAn\serror\soccur\n/s)
    });
  });

  it("catch an axios error with console", () => {
    const buf = execSync("ts-node ./src/test-files/axiosError.ts");
    const out = formatOutput(buf);
    expect(out).toEqual({
      message: "timeout of 100ms exceeded",
      name: "AxiosError",
      stack: expect.stringMatching(
        /AxiosError:\stimeout\sof\s100ms\sexceeded\n/s
      ),
      config: {
        transitional: {
          silentJSONParsing: true,
          forcedJSONParsing: true,
          clarifyTimeoutError: false
        },
        adapter: ["xhr", "http"],
        transformRequest: [],
        transformResponse: [],
        timeout: 100,
        xsrfCookieName: "XSRF-TOKEN",
        xsrfHeaderName: "X-XSRF-TOKEN",
        maxContentLength: -1,
        maxBodyLength: -1,
        env: {},
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "axios/1.6.7",
          "Accept-Encoding": "gzip, compress, deflate, br"
        },
        method: "get",
        url: "http://localhost:0000"
      },
      code: "ECONNABORTED",
      status: null
    });
  });

  it("catch a simple exception with console capturing enabled", () => {
    const buf = execSync("ts-node ./src/test-files/textError.ts");
    const out = formatOutput(buf);
    expect(out).toEqual({
      name: "Error",
      message: "An error occur",
      stack: expect.stringMatching(/Error:\sAn\serror\soccur\n/s)
    });
  });

  function formatOutput(buf: Buffer): any {
    const decolorized = stripColor(buf.toString());
    const matched = decolorized.match(
      /^\d{2}\s[A-z]{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\s\([+-]*\d{2}:\d{2}\)\serror:\s(.*)$/s
    );
    if (!matched) throw new Error("No match found in output");
    let obj: any;
    eval("obj=" + matched[1]);
    return obj;
  }
});

describe("files transport", () => {
  let logger: Logger;
  beforeEach(() => {
    rmSync(resolve("./", "logs"), { recursive: true, force: true });
  });

  afterEach(() => {
    if (logger) {
      const fileErrorTransport = getFileErrorTransport(logger);
      logger.exceptions.unhandle(fileErrorTransport);
      logger.rejections.unhandle(fileErrorTransport);
      process.removeAllListeners("uncaughtException");
      process.removeAllListeners("unhandledRejection");
    }
  });

  afterAll(() => {
    rmSync(resolve("./", "logs"), { recursive: true, force: true });
  });

  it("log to file: single string", async () => {
    logger = new LogVault().withFiles().logger;
    logger.info("A log record");
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        extra: [],
        level: "info",
        message: "A log record",
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: curcular values", async () => {
    logger = new LogVault().withFiles().logger;
    const circular: { a: string; content: string | object } = {
      a: "b",
      content: ""
    };
    circular.content = circular;
    logger.warn(circular);
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        level: "warn",
        message: { a: "b", content: "...[Truncated]" },
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        extra: [],
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: extra arguments", async () => {
    logger = new LogVault().withFiles().logger;
    logger.info("This is a test", { a: 1 });
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        extra: [
          {
            a: 1
          }
        ],
        level: "info",
        message: "This is a test",
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: truncate object nested prop", async () => {
    const logger = new LogVault().withFiles().logger;
    logger.info({
      deep: { some: { obj: { deep: { deep: "nested" } } } },
      not_nested: "value"
    });
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        extra: [],
        level: "info",
        message: {
          deep: {
            some: {
              obj: {
                deep: "...[Truncated]"
              }
            }
          },
          not_nested: "value"
        },
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: shrink long strings", async () => {
    const logger = new LogVault().withFiles().logger;
    logger.info("a".repeat(4096));
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        level: "info",
        message: "a".repeat(2048) + "...",
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        extra: [],
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: custom meta", async () => {
    const logger = new LogVault().withFiles().logger;
    logger.info(
      "A log record",
      new LogOptions({ meta: { myCustomKey: "value" } }),
      "something else"
    );
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        extra: ["something else"],
        level: "info",
        message: "A log record",
        meta: {
          environment: "test",
          myCustomKey: "value",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: catch simple exception", async () => {
    execSync("ts-node ./src/test-files/textErrorWithFiles.ts");
    const parsed = await readLogFile("error");
    expect(parsed).toEqual([
      {
        level: "error",
        message: {
          message: "An error occur",
          name: "Error",
          stack: expect.stringMatching(/Error:\sAn\serror\soccur\n/s)
        },
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: catch axios exception", async () => {
    execSync("ts-node ./src/test-files/axiosErrorWithFiles.ts");
    const parsed = await readLogFile("error");
    expect(parsed).toEqual([
      {
        level: "error",
        message: {
          code: "ECONNABORTED",
          config: {
            adapter: ["xhr", "http"],
            env: {},
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Encoding": "gzip, compress, deflate, br",
              "User-Agent": "axios/1.6.7"
            },
            maxBodyLength: -1,
            maxContentLength: -1,
            method: "get",
            timeout: 100,
            transformRequest: [],
            transformResponse: [],
            transitional: {
              clarifyTimeoutError: false,
              forcedJSONParsing: true,
              silentJSONParsing: true
            },
            url: "http://localhost:0000",
            xsrfCookieName: "XSRF-TOKEN",
            xsrfHeaderName: "X-XSRF-TOKEN"
          },
          message: "timeout of 100ms exceeded",
          name: "AxiosError",
          stack: expect.stringMatching(
            /AxiosError:\stimeout\sof\s100ms\sexceeded\n/s
          ),
          status: null
        },
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: mask sensitive field: password", async () => {
    const { logger } = new LogVault().withFiles();
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    const parsed = await readLogFile("http");
    expect(parsed).toEqual([
      {
        extra: [],
        level: "info",
        message: { password: "...[Masked]", user: "username" },
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: capture a single string", async () => {
    const logVault = new LogVault().withFiles().captureConsole();
    console.log("logging with console.log");
    const parsed = await readLogFile("http");
    logVault.uncaptureConsole();
    expect(parsed).toEqual([
      {
        extra: [],
        level: "info",
        message: "logging with console.log",
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  it("log to file: capture different entities", async () => {
    const logVault = new LogVault().withFiles().captureConsole();
    console.log("this is an object:", { some: "data" }, [1, 2]);
    const parsed = await readLogFile("http");
    logVault.uncaptureConsole();
    expect(parsed).toEqual([
      {
        extra: [{ some: "data" }, [1, 2]],
        level: "info",
        message: "this is an object:",
        meta: {
          environment: "test",
          process: "log-vault",
          project: "log-vault"
        },
        timestamp: expect.stringMatching(defaultTimestampRegexp)
      }
    ]);
  });

  function parseFileContent(content: string): object {
    let str = "[" + content.replaceAll(/\n}\n{/g, "\n},\n{");
    str = str.slice(0, -1) + "]";
    return JSON.parse(str);
  }

  function getLogFileName(level: string): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts();
    return `${level}-${parts[4].value}-${parts[0].value}-${parts[2].value}.log`;
  }

  async function readLogFile(level: string): Promise<object> {
    await wait(50);
    const logFileName = getLogFileName(level);
    const content = readFileSync(resolve("./logs", logFileName), {
      encoding: "utf-8"
    });

    const parsed = parseFileContent(content);
    return parsed;
  }

  function getFileErrorTransport(logger: Logger): TransportStream {
    const transport = logger.transports?.find(
      (transport) =>
        transport instanceof DailyRotateFile && transport.handleExceptions
    );
    if (!transport) throw new Error("Couldn't unhandle files transport");
    return transport;
  }
});

describe("mongo transport", () => {
  let logger: Logger;
  let logVault: LogVault;
  let output: any = "";
  let spy: any;

  beforeEach(() => {
    logVault = new LogVault()
      .withMongo({
        db: "mongodb+srv://user:pass@cluster0.zooxqjl.mongodb.net/?retryWrites=true&w=majority"
      })
      .captureConsole();
    logger = logVault.logger;
    const mongo = logger.transports.find((t) => t instanceof MongoDB);
    if (!mongo) throw new Error("Failed to instantiate Mongo connection");
    spy = jest.spyOn(mongo, "log").mockImplementation((data) => {
      output = data;
    });
  });

  afterEach(() => {
    if (logger) {
      const transport = logger.transports.find((t) => t instanceof MongoDB);
      logVault.uncaptureConsole();
      if (transport) {
        logger.exceptions.unhandle(transport);
        logger.rejections.unhandle(transport);
        process.removeAllListeners("uncaughtException");
        process.removeAllListeners("unhandledRejection");
      }
    }
  });

  it("log to mongo: single message", async () => {
    logger.info("Single message");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      message: "Single message",
      level: "info",
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      }
    });
  });

  it("log to mongo: curcular values", async () => {
    const circular: { a: string; content: string | object } = {
      a: "b",
      content: ""
    };
    circular.content = circular;
    logger.warn(circular);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "warn",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: '{\n  "a": "b",\n  "content": "...[Truncated]"\n}'
    });
  });

  it("log to mongo: extra arguments", async () => {
    logger.info("This is a test", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: ["This is a test", { a: 1 }]
    });
  });

  it("log to mongo: truncate object nested prop", async () => {
    logger.info({
      deep: { some: { obj: { deep: { deep: "nested" } } } },
      not_nested: "value"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message:
        "{\n" +
        '  "deep": {\n' +
        '    "some": {\n' +
        '      "obj": {\n' +
        '        "deep": "...[Truncated]"\n' +
        "      }\n" +
        "    }\n" +
        "  },\n" +
        '  "not_nested": "value"\n' +
        "}"
    });
  });

  it("log to file: shrink long strings", async () => {
    logger.info("a".repeat(4096));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      level: "info",
      message: "a".repeat(2048) + "...",
      meta: {
        environment: "test",
        process: "log-vault",
        project: "log-vault"
      },
      timestamp: expect.stringMatching(defaultTimestampRegexp)
    });
  });

  it("log to file: custom meta", async () => {
    logger.info(
      "A log record",
      new LogOptions({ meta: { myCustomKey: "value" } }),
      "something else"
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test",
        myCustomKey: "value"
      },
      message: ["A log record", "something else"]
    });
  });

  it("log to file: mask sensitive field: password", async () => {
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: '{\n  "user": "username",\n  "password": "...[Masked]"\n}'
    });
  });

  it("log to file: capture a single string", async () => {
    console.log("logging with console.log");
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: "logging with console.log"
    });
  });

  it("log to file: capture different entities", async () => {
    console.log("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: ["this is an object:", { some: "data" }, [1, 2]]
    });
  });
});

describe("loki transport", () => {
  let output: any;
  let logger: Logger;
  let logVault: LogVault;
  let spy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    logVault = new LogVault().withLoki().captureConsole();
    logger = logVault.logger;
    const loki = logger.transports.find((t) => t instanceof LokiTransport);
    if (!loki) throw new Error("Couldn't assign Loki transport");
    spy = jest.spyOn(loki, "log").mockImplementation((data) => {
      output = data;
    });
  });

  afterEach(() => {
    if (logger) {
      logVault.uncaptureConsole();
      const transport = logger.transports.find(
        (t) => t instanceof LokiTransport
      );
      if (transport) {
        logger.exceptions.unhandle(transport);
        logger.rejections.unhandle(transport);
        process.removeAllListeners("uncaughtException");
        process.removeAllListeners("unhandledRejection");
      }
    }
  });

  it("log to loki: single message", async () => {
    logger.info("Log record");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: { meta: { process: "log-vault" }, content: "Log record" },
      [MESSAGE]: '{"meta":{"process":"log-vault"},"content":"Log record"}'
    });
  });

  it("log to loki: curcular values", async () => {
    const circular: { a: string; content: string | object } = {
      a: "b",
      content: ""
    };
    circular.content = circular;
    logger.warn(circular);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "warn",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content: '{\n  "a": "b",\n  "content": "...[Truncated]"\n}'
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":"{\\n  \\"a\\": \\"b\\",\\n  \\"content\\": \\"...[Truncated]\\"\\n}"}'
    });
  });

  it("log to loki: extra arguments", async () => {
    logger.info("This is a test", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content: ["This is a test", { a: 1 }]
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":["This is a test",{"a":1}]}'
    });
  });

  it("log to mongo: truncate object nested prop", async () => {
    logger.info({
      deep: { some: { obj: { deep: { deep: "nested" } } } },
      not_nested: "value"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content:
          "{\n" +
          '  "deep": {\n' +
          '    "some": {\n' +
          '      "obj": {\n' +
          '        "deep": "...[Truncated]"\n' +
          "      }\n" +
          "    }\n" +
          "  },\n" +
          '  "not_nested": "value"\n' +
          "}"
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":"{\\n  \\"deep\\": {\\n    \\"some\\": {\\n      \\"obj\\": {\\n        \\"deep\\": \\"...[Truncated]\\"\\n      }\\n    }\\n  },\\n  \\"not_nested\\": \\"value\\"\\n}"}'
    });
  });

  it("log to loki: shrink long strings", async () => {
    logger.info("a".repeat(4096));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      level: "info",
      // message: "a".repeat(2048) + "...",
      labels: { project: "log-vault", environment: "test" },
      message: {
        content: "a".repeat(2048) + "...",
        meta: { process: "log-vault" }
      },
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      [MESSAGE]: JSON.stringify({
        meta: { process: "log-vault" },
        content: "a".repeat(2048) + "..."
      })
    });
  });

  it("log to loki: custom meta", async () => {
    logger.info(
      "A log record",
      new LogOptions({ meta: { myCustomKey: "value" } }),
      "something else"
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault", myCustomKey: "value" },
        content: ["A log record", "something else"]
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault","myCustomKey":"value"},"content":["A log record","something else"]}'
    });
  });

  it("log to loki: mask sensitive field: password", async () => {
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content: '{\n  "user": "username",\n  "password": "...[Masked]"\n}'
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":"{\\n  \\"user\\": \\"username\\",\\n  \\"password\\": \\"...[Masked]\\"\\n}"}'
    });
  });

  it("log to loki: capture a single string", async () => {
    console.log("logging with console.log");
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content: "logging with console.log"
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":"logging with console.log"}'
    });
  });

  it("log to loki: capture different entities", async () => {
    console.log("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      labels: { project: "log-vault", environment: "test" },
      message: {
        meta: { process: "log-vault" },
        content: ["this is an object:", { some: "data" }, [1, 2]]
      },
      [MESSAGE]:
        '{"meta":{"process":"log-vault"},"content":["this is an object:",{"some":"data"},[1,2]]}'
    });
  });
});

describe("notifications transport", () => {
  let logger: Logger;
  let logVault: LogVault;
  let output: any = "";
  let spy: any;

  beforeEach(() => {
    logVault = new LogVault().withNotifications().captureConsole();
    logger = logVault.logger;
    const notificationsTransport = logger.transports.find(
      (t) => t instanceof NotificationsTransport
    );
    if (!notificationsTransport)
      throw new Error("Failed to instantiate Mongo connection");
    spy = jest
      .spyOn(notificationsTransport, "log")
      .mockImplementation((data) => {
        output = data;
      });
  });

  afterEach(() => {
    if (logger) {
      logVault.uncaptureConsole();
      const transport = logger.transports.find(
        (t) => t instanceof NotificationsTransport
      );
      if (transport) {
        logger.exceptions.unhandle(transport);
        logger.rejections.unhandle(transport);
        process.removeAllListeners("uncaughtException");
        process.removeAllListeners("unhandledRejection");
      }
    }
  });

  it("notifications transport: single string message", async () => {
    logger.info("A single string message");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: { project: "log-vault", process: "log-vault", environment: "test" },
      message: "A single string message"
    });
  });

  it("notifications transport: curcular values", async () => {
    const circular: { a: string; content: string | object } = {
      a: "b",
      content: ""
    };
    circular.content = circular;
    logger.warn(circular);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "warn",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: { a: "b", content: "...[Truncated]" }
    });
  });

  it("notifications transport: extra arguments", async () => {
    logger.info("This is a test", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: ["This is a test", { a: 1 }]
    });
  });

  it("notifications transport: truncate object nested prop", async () => {
    logger.info({
      deep: { some: { obj: { deep: { deep: "nested" } } } },
      not_nested: "value"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: {
        deep: { some: { obj: { deep: "...[Truncated]" } } },
        not_nested: "value"
      }
    });
  });

  it("notifications transport: shrink long strings", async () => {
    logger.info("a".repeat(4096));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      level: "info",
      message: "a".repeat(2048) + "...",
      meta: {
        environment: "test",
        process: "log-vault",
        project: "log-vault"
      },
      timestamp: expect.stringMatching(defaultTimestampRegexp)
    });
  });

  it("notifications transport: custom meta", async () => {
    logger.info(
      "A log record",
      new LogOptions({ meta: { myCustomKey: "value" } }),
      "something else"
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test",
        myCustomKey: "value"
      },
      message: ["A log record", "something else"]
    });
  });

  it("notifications transport: mask sensitive field: password", async () => {
    logger.info({
      user: "username",
      password: "P@ssw0rd"
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: { user: "username", password: "...[Masked]" }
    });
  });

  it("notifications transport: capture a single string", async () => {
    console.log("logging with console.log");
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: "logging with console.log"
    });
  });

  it("notifications transport: capture different entities", async () => {
    console.log("this is an object:", { some: "data" }, [1, 2]);
    expect(spy).toHaveBeenCalledTimes(1);
    logVault.uncaptureConsole();
    expect(output).toEqual({
      timestamp: expect.stringMatching(defaultTimestampRegexp),
      level: "info",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      message: ["this is an object:", { some: "data" }, [1, 2]]
    });
  });
});
