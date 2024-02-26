import stripColor from "strip-color";
import { Logger } from "winston";
import { Console } from "winston/lib/winston/transports";
import { LogVault } from "./LogVault";
import { execSync } from "node:child_process";

describe("Console transport: logging", () => {
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

describe("Console transport:catching exceptions and rejections", () => {
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
