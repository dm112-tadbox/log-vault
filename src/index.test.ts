import LokiTransport from "winston-loki";
import { Level, LogVault } from "./index";
import capcon from "capture-console";
import { readFileSync, rmSync } from "fs";
import { resolve } from "node:path";

let output: string;

describe.skip("console transport", () => {
  beforeEach(() => {
    output = "";
    consoleCaptureStart();
  });

  afterEach(() => {
    consoleCaptureEnd();
  });

  it("console maxLevel should be info by the default", () => {
    const logger = new LogVault();
    logger.log("HTTP log message", { level: "http" });
    const { level, message } = extractOutput();

    console.log(level, message);
  });

  it.skip("logger with console", () => {
    const logger = new LogVault();

    logger.error("hi there");
    logger.warn("hi there");
    logger.info("hi there");
    logger.http("hi there");
    logger.verbose("hi there");
    logger.debug("hi there");
    logger.silly("hi there");
  });

  // it.skip("log different things", async () => {
  //   const logger = new LogVault();

  //   logger.log({
  //     foo: "bar"
  //   });
  // });

  // it.skip("log circular", async () => {
  //   const logger = new LogVault();

  //   const chineseBox: { a: string; content: string | object } = {
  //     a: "b",
  //     content: ""
  //   };
  //   chineseBox.content = chineseBox;

  //   logger.log(chineseBox);
  // });
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

describe.skip("loki transport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("log to loki", async () => {
    const logger = new LogVault({ noConsole: true }).withLoki();

    const loki = logger.logger.transports.find(
      (t) => t instanceof LokiTransport
    );
    if (!loki) return;

    const spy = jest.spyOn(loki, "log");
    /* .mockImplementation((info) => {
      console.log(info);
    }); */

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

function consoleCaptureStart() {
  output = "";
  capcon.startCapture(process.stdout, function (stdout) {
    output += stdout;
  });
}

function consoleCaptureEnd() {
  capcon.stopCapture(process.stdout);
}

function extractOutput() {
  const stringifiedOutput = JSON.stringify(output);
  const regexp =
    /\\t\d{4,5}(-\d{2}){2}T(\d{2}:){2}\d{2}.\d{3}Z\s*\\u001b\[\d{2}m(.+)\\u001b\[39m\s*(.+)\\n/g;
  const match = regexp.exec(stringifiedOutput);
  return {
    level: match ? match[3] : null,
    message: match ? match[4] : null
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}
