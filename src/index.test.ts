import { LogVault } from "./index";

describe("LogVault class", () => {
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

  it("log to loki", async () => {
    const logger = new LogVault({ noConsole: true }).withLoki();
    // const res = await axios.get("https://google.com");

    const chineseBox: { a: string; content: string | object } = {
      a: "bbbbbb",
      content: ""
    };
    chineseBox.content = chineseBox;

    logger.log("Request data:", chineseBox);

    // await wait(1000);
  });
});

// function wait(ms: number): Promise<void> {
//   return new Promise((resolve) => {
//     setTimeout(() => resolve(), ms);
//   });
// }
