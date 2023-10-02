import chai from "chai";
import { LogVault } from "../src/LogVault";
import path from "path";
import { rm, readFile } from "fs/promises";
import capcon from "capture-console";
import moment from "moment";
import process from "node:process";
import { MongoClient } from "mongodb";
import Redis from "ioredis";
import express from "express";
import bodyParser from "body-parser";
import { waitForDebugger } from "inspector";

let redis = new Redis();
const expressApp = express();
let mockServer;
const mockPort = 8021;

const should = chai.should();
let output;
let tgMockBody;
const emailResMock = {
  accepted: ["dm112@tadbox.com"],
  rejected: [],
  ehlo: ["PIPELINING", "8BITMIME", "SMTPUTF8", "AUTH LOGIN PLAIN"],
  envelopeTime: 296,
  messageTime: 236,
  messageSize: 597,
  response:
    "250 Accepted [STATUS=new MSGID=ZCbfhP7y76xDTczKZLFLbYw0bmaB1SeNAAAOwi0beFsaF2gxglQcFjwv-TM]",
  envelope: { from: "some1@ethereal.email", to: ["some2@ethereal.email"] },
  messageId: "<f3f27b45-e014-d3f4-556a-d35534ccd638@ethereal.email>"
};

describe("console transport", () => {
  beforeEach(() => {
    output = "";
    consoleCaptureStart();
  });

  afterEach(() => {
    consoleCaptureEnd();
  });

  it("test all console levels", () => {
    consoleCaptureEnd();
    const logger = new LogVault({ maxLevel: "silly" }).withConsole();
    const levels = Object.keys(logger.levels);

    levels.forEach((level) => {
      output = "";
      consoleCaptureStart();
      const message = `Message for level ${level}`;
      logger.log(message, { level });
      consoleCaptureEnd();
      const extracted = extractOutput();
      extracted.level.should.equal(level);
      extracted.message.should.equal(message);
    });
  });

  it("console maxLevel should be info by the default", () => {
    const logger = new LogVault().withConsole();
    logger.log("HTTP log message", { level: "http" });
    const { level, message } = extractOutput();
    should.not.exist(level);
    should.not.exist(message);
  });

  it("console with custom default maxLevel", () => {
    const logger = new LogVault({ maxLevel: "http" }).withConsole();
    logger.log("HTTP log message", { level: "http" });
    const { level, message } = extractOutput();
    level.should.equal("http");
    message.should.equal("HTTP log message");
  });

  it("console with custom console maxLevel", () => {
    const logger = new LogVault().withConsole({ level: "http" });
    logger.log("HTTP log message", { level: "http" });
    const { level, message } = extractOutput();
    level.should.equal("http");
    message.should.equal("HTTP log message");
  });
});

describe("files transport", () => {
  beforeEach(async () => {
    const logDirPath = path.resolve(__dirname, "../src/logs");
    await rm(logDirPath, { recursive: true, force: true });
  });

  it("writing to a file", async () => {
    const logger = new LogVault().withFiles();

    logger.log("This should be logged to a file only");
    process.nextTick(async () => {
      const date = moment().format("YYYY-MM-DD");
      const filePath = path.resolve(
        __dirname,
        `../src/logs/combined/combined-${date}.log`
      );
      const contents = await readFile(filePath, { encoding: "utf8" });
      const parsed = parseLogFile(contents);
      parsed.should.be.a("array").and.have.length(1);
      parsed[0].level.should.equal("info");
      parsed[0].message.should.equal("This should be logged to a file only");
      parsed[0].metadata.log_level.should.equal("info");
      parsed[0].metadata.process.should.equal("log-vault");
      parsed[0].metadata.should.include.keys("serverIp", "timestamp");
    });
  });
});

describe("mongo transport", () => {
  let collection;
  const uri = "mongodb://localhost:27017";
  beforeEach(async () => {
    const client = new MongoClient(uri);
    const dbname = "test";
    await client.connect();
    const db = client.db(dbname);
    collection = db.collection("log");
    await collection.deleteMany();
  });

  it("writing to mongo", async function () {
    const logger = new LogVault().withMongo({
      uri
    });

    let res;
    logger.transportMongo.on("logged", async () => {
      res = await collection.find({}).toArray();
    });

    await logger.log("This should be logged to mongodb only");

    await waitForMongo();

    res.should.be.a("array").and.have.length(1);
    res[0].log_level.should.equal("info");
    res[0].message.should.equal("This should be logged to mongodb only");
    res[0].process.should.equal("log-vault");
    res[0].should.include.keys("serverIp", "timestamp", "env");

    function waitForMongo() {
      return new Promise(async (resolve, reject) => {
        for await (const i of new Array(1000)) {
          if (res) break;
          await pause(10);
        }
        resolve();
      });
    }
  });
});

describe("notifications", () => {
  const tgOptions = {
    token: "6218581423:BBupeavzTN_1PuGLfpbcJjfPsWP8DjqmwCM",
    group: "-1001923566545",
    baseUrl: `http://localhost:${mockPort}/`
  };

  const emailOptions = {
    queueTimeout: 1000,
    nodemailerOptions: {
      host: "smtp.ethereal.email",
      port: "587",
      auth: {
        user: "ezekiel27@ethereal.email",
        pass: "eJJTMXjGfnAJY3juXK"
      }
    },
    from: "ezekiel27@ethereal.email",
    to: "dm112@tadbox.com",
    subject: `Alarm notification from LogVault`,
    mock: emailResMock
  };

  beforeEach(async () => {
    const keys = await redis.keys("log-vault:*");
    for await (const key of keys) {
      await redis.del(key);
    }

    const blkKeys = await redis.keys(`log-vault:blk-alarm-transport:*`);
    for await (const key of blkKeys) {
      await redis.del(key);
    }
    const logDirPath = path.resolve(__dirname, "../src/logs");
    await rm(logDirPath, { recursive: true, force: true });
    await mockServerStart();
  });

  afterEach(async () => {
    await mockServerStop();
  });

  it.skip("track notification", async () => {
    const logger = new LogVault().withFiles();
    logger.trackNotifications({
      notificators: [
        {
          channels: ["telegram"],
          searchPattern: "."
        }
      ]
    });
    logger.log("should be tracked");
    const keys = await waitForRedis();
    keys.length.should.equal(1);
    const value = JSON.parse(await redis.get(keys[0]));
    value.should.be
      .a("object")
      .and.have.keys(
        "env",
        "process",
        "log_level",
        "timestamp",
        "serverIp",
        "message"
      );
    value.env.should.equal(process.env.NODE_ENV);
    value.process.should.equal(process.env.npm_package_name);
    value.log_level.should.equal("info");
    value.message.should.equal("should be tracked");

    function waitForRedis() {
      return new Promise(async (resolve, reject) => {
        for await (const i of new Array(100)) {
          const keys = await redis.keys("log-vault:alarm:telegram:*");
          if (keys.length) resolve(keys);
          await pause(10);
        }
      });
    }
  });

  it("track notification with pattern", async () => {
    const logger = new LogVault()
      .withConsole()
      .addNotificationChannel({
        type: "telegram",
        name: "Main group",
        options: tgOptions
      })
      .addNotification({
        channels: ["Main group"],
        searchPattern: "."
      });
    logger.serveNotifications();

    await logger.log("should not be tracked");
    await logger.info("contain required pattern, but should not be tracked");
    await logger.error("required to be tracked");
    logger;
    await pause(15000);
    // await pause(100);
    // const keys = await redis.keys("log-vault:alarm:telegram:*");
    // keys.length.should.equal(1);
    // const value = JSON.parse(await redis.get(keys[0]));
    // value.message.should.equal("required to be tracked");
  });

  it("Stop", () => process.exit(0));

  it("send notification with telegram", async () => {
    const logger = new LogVault().withFiles();
    logger
      .trackNotifications({
        notificators: [
          {
            channels: ["telegram"],
            searchPattern: "."
          }
        ]
      })
      .queueNotifications({
        telegram: tgOptions
      });
    logger.silly({ message: "should be tracked" });
    for await (const i of new Array(1000)) {
      await pause(10);
      if (tgMockBody) break;
    }
    tgMockBody.should.be
      .a("object")
      .and.include.keys("chat_id", "text", "parse_mode");
    tgMockBody.chat_id.should.equal(tgOptions.group);
    tgMockBody.parse_mode.should.equal("Markdown");
  });

  it("send notification with email", async () => {
    const logger = new LogVault()
      .withFiles()
      .trackNotifications({
        notificators: [
          {
            channels: ["email"],
            searchPattern: "."
          }
        ]
      })
      .queueNotifications({
        email: emailOptions
      });
    setTimeout(() => {
      logger.warn({ foo: "sent by the email" });
    }, 100);
    const keys = await waitForRedisKey("log-vault:alarm:email:*");
    keys.should.be.a("array").and.have.length(1);
    const check = await waitForRedisKeyReverse(keys[0]);
    check.should.equal(true);
  });

  it("send notification with email if telegram failed", async function () {
    await mockServerStop();
    const logger = new LogVault()
      .withFiles()
      .trackNotifications({
        notificators: [
          {
            channels: ["telegram"],
            searchPattern: "."
          },
          {
            channels: ["email"],
            searchPattern: "Failed to send log notification with telegram"
          }
        ]
      })
      .queueNotifications({
        email: emailOptions,
        telegram: tgOptions
      });
    setTimeout(() => {
      logger.log("should fail");
    }, 100);
    const check = await waitForRedisKeyReverse("log-vault:alarm:email:*");
    check.should.equal(true);
  });
});

describe("errors handling cases", () => {
  beforeEach(async () => {
    const url = "mongodb://localhost:27017";
    const client = new MongoClient(url);
    const dbname = "test";
    await client.connect();
    const db = client.db(dbname);
    const collection = db.collection("log");
    await collection.deleteMany();

    const keys = await redis.keys("log-vault:*");
    for await (const key of keys) {
      await redis.del(key);
    }

    const blkKeys = await redis.keys(`log-vault:blk-alarm-transport:*`);
    for await (const key of blkKeys) {
      await redis.del(key);
    }
  });

  it("track graylog tcp error", async function () {
    const logger = new LogVault()
      .withGraylog({
        uri: "http://localhost:12202",
        timeout: 1000
      })
      .capture()
      .trackNotifications({
        notificators: [
          {
            channels: ["telegram"],
            searchPattern: "GRAYLOG_ERR"
          }
        ]
      });
    logger.log("should not be logged");

    const keys = await waitForRedis();
    keys.length.should.equal(1);
    const value = await redis.get(keys[0]);
    const match = value.match("GRAYLOG_ERR");
    should.exist(match);

    function waitForRedis() {
      return new Promise(async (resolve, reject) => {
        for await (const i of new Array(100)) {
          const keys = await redis.keys("log-vault:alarm:telegram:*");
          if (keys.length) resolve(keys);
          await pause(10);
        }
      });
    }
  });

  it("track mongo connection error", async function () {
    const logger = new LogVault()
      .withMongo({
        uri: "mongodb://localhost:27018",
        options: {
          serverSelectionTimeoutMS: 100
        }
      })
      .capture()
      .trackNotifications({
        notificators: [
          {
            channels: ["telegram"],
            searchPattern: "LOG_MONGO_ERR"
          }
        ]
      });
    logger.log("This can't be logged");

    const keys = await waitForRedis();
    keys.length.should.equal(1);
    const value = await redis.get(keys[0]);
    const match = value.match("LOG_MONGO_ERR");
    should.exist(match);

    function waitForRedis() {
      return new Promise(async (resolve, reject) => {
        for await (const i of new Array(100)) {
          const keys = await redis.keys("log-vault:alarm:telegram:*");
          if (keys.length) resolve(keys);
          await pause(10);
        }
      });
    }
  });
});

describe("capturing output", () => {
  beforeEach(() => {
    output = "";
    consoleCaptureStart();
  });

  afterEach(() => {
    consoleCaptureEnd();
  });

  it("capture console log", () => {
    consoleCaptureEnd();
    const logger = new LogVault().withConsole();
    logger.capture();

    output = "";
    consoleCaptureStart();
    const message = "capture console log";
    console.log(message);
    consoleCaptureEnd();
    const extracted = extractOutput();
    extracted.level.should.equal("info");
    extracted.message.should.equal(message);
  });

  it("capture console warn", () => {
    consoleCaptureEnd();
    const logger = new LogVault().withConsole();
    logger.capture();

    output = "";
    consoleCaptureStart();
    const message = "capture console warn";
    console.warn(message);
    consoleCaptureEnd();
    const extracted = extractOutput();
    extracted.level.should.equal("warn");
    extracted.message.should.equal(message);
  });

  it("capture console error", () => {
    consoleCaptureEnd();
    const logger = new LogVault().withConsole();
    logger.capture();

    output = "";
    consoleCaptureStart();
    const message = "capture console error";
    console.error(message);
    consoleCaptureEnd();
    const extracted = extractOutput();
    extracted.level.should.equal("error");
    extracted.message.should.equal(message);
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

function pause(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

function parseLogFile(contents) {
  const arr = contents.split("\n");
  const result = [];
  arr.forEach((log) => {
    if (log.length) result.push(JSON.parse(log));
  });
  return result;
}

async function mockServerStart() {
  return new Promise((resolve, reject) => {
    expressApp.use(bodyParser.json());
    expressApp.post("/:tokenstring/sendMessage", (req, res) => {
      tgMockBody = req.body;
      return res.status(200).send({ ok: true });
    });
    mockServer = expressApp.listen(mockPort, () => resolve());
  });
}

async function mockServerStop() {
  return new Promise((resolve, reject) => {
    tgMockBody = null;
    mockServer.close(() => resolve());
  });
}

async function waitForRedisKey(pattern) {
  for await (const i of new Array(100)) {
    const keys = await redis.keys(pattern);
    if (keys?.length) return keys;
    await pause(100);
  }
}

async function waitForRedisKeyReverse(pattern) {
  for await (const i of new Array(10)) {
    await pause(100);
    const keys = await redis.keys(pattern);
    if (!keys?.length) return true;
  }
}
