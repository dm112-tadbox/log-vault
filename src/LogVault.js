import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import ip from "ip";
import mongoTransport from "./transports/mongodb";
import Redis from "ioredis";
import sha256 from "sha256";
require("winston-mongodb");
import Notificator from "./Notificator";
import Telegram from "./transports_notifications/telegram";
import GraylogHttpTransport from "./transports/graylog-http";
import Email from "./transports_notifications/email";

const { timestamp, printf } = winston.format;

export default class LogVault {
  constructor(config = {}) {
    // defaults
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6
    };
    const {
      maxLevel = "info",
      appName,
      trackNodeEnv = true,
      trackServerIp = true
    } = config;

    if (!Object.keys(this.levels).includes(maxLevel))
      throw new Error(
        `maxLevel "${maxLevel}" value is not included into ${JSON.stringify(
          this.levels
        )}`
      );

    this.maxLevel = maxLevel;
    this.appName = appName;
    this.trackNodeEnv = trackNodeEnv;
    this.trackServerIp = trackServerIp;

    this.winstonLogger = winston.createLogger({
      levels: this.levels,
      level: this.maxLevel,
      exitOnError: false
    });

    Object.keys(this.levels).forEach((level) => {
      this[level] = (message, options = {}) => {
        options.level = level;
        this.log(message, options);
      };
    });

    return this;
  }

  withConsole(options = {}) {
    const { level = this.maxLevel } = options;

    const colors = {
      error: "red",
      warn: "yellow",
      info: "green",
      http: "blue",
      verbose: "magenta",
      debug: "grey",
      silly: "grey"
    };
    winston.addColors(colors);

    const consoleFormat = printf(({ level, message, timestamp }) => {
      if (typeof message === "object")
        message = "\n" + JSON.stringify(message, null, 2);
      const output = `\t${timestamp} ${level} ${message}`;
      return output;
    });

    const transportConsole = new winston.transports.Console({
      level,
      format: winston.format.combine(
        timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
        consoleFormat
      )
    });

    this.winstonLogger.add(transportConsole);
    this.transportConsole = transportConsole;
    return this;
  }

  withFiles(options = {}) {
    const {
      logPath = path.resolve(__dirname, "logs"),
      fileMaxSize = "1m",
      fileStoragePeriod = "14d"
    } = options;
    const logPathCombined = path.resolve(logPath, "combined");
    const logPathError = path.resolve(logPath, "error");
    const logPathFile = path.resolve(logPathCombined, "combined-%DATE%.log");
    const logPathErrorFile = path.resolve(logPathError, "error-%DATE%.log");
    const auditFile = path.resolve(logPath, "audit");
    const transportFileCombined = new winston.transports.DailyRotateFile({
      filename: logPathFile,
      level: "http",
      // format: combine(timestamp(), winston.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: fileMaxSize,
      maxFiles: fileStoragePeriod,
      exitOnError: false
    });
    const transportFileError = new winston.transports.DailyRotateFile({
      filename: logPathErrorFile,
      level: "error",
      // format: combine(timestamp(), winston.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: fileMaxSize,
      maxFiles: fileStoragePeriod,
      exitOnError: false
    });

    this.winstonLogger.add(transportFileCombined);
    this.winstonLogger.add(transportFileError);
    this.transportFileCombined = transportFileCombined;
    this.transportFileError = transportFileError;

    return this;
  }

  withMongo(options) {
    if (!options.level) options.level = this.maxLevel;
    // const mongo = new winston.transports.MongoDB(options);
    const mongo = new mongoTransport(options);
    this.winstonLogger.add(mongo);
    this.transportMongo = mongo;
    return this;
  }

  withGraylog(options = {}) {
    const graylog = new GraylogHttpTransport(options);
    this.winstonLogger.add(graylog);
    this.transportGraylog = graylog;
    return this;
  }

  log(message, options = {}) {
    const { level = "info" } = options;

    const metadata = {
      // message,
      process: process.env.npm_package_name,
      log_level: level,
      timestamp: new Date()
    };
    if (this.appName) metadata.app = this.appName;
    if (this.trackNodeEnv) metadata.env = process.env.NODE_ENV;
    if (this.trackServerIp) metadata.serverIp = ip.address();

    this.winstonLogger.log(level, {
      message,
      metadata
    });

    if (this.redis && this.notificators) {
      this.notificators.forEach((notificator) => {
        if (
          notificator.level &&
          this.levels[level] > this.levels[notificator.level]
        )
          return;
        metadata.message = message;
        const stringifiedData = JSON.stringify(metadata);
        const stringifiedMessage =
          typeof message === "string" ? message : JSON.stringify(message);
        const matched = notificator.regExp.test(stringifiedMessage);
        if (!matched) return;
        const hash = sha256(stringifiedData);
        notificator.channels.forEach((channel) => {
          this.redis.set(`log-vault:alarm:${channel}:${hash}`, stringifiedData);
        });
      });
    }
  }

  capture(options) {
    const methods = ["log", ...Object.keys(this.levels)];
    methods.forEach((method) => {
      console[method] = (...args) => {
        const messages = Object.values(args);
        const level = method === "log" ? "info" : method;
        messages.forEach((message) => this.log(message, { level }));
      };
    });

    if (options?.dismissExceptions) return;
    process.on("uncaughtException", (e) => {
      this.log(e.stack, { level: "error" });
    });
    return this;
  }

  trackNotifications(options = {}) {
    const { redisOptions = {}, notificators = [] } = options;
    this.redis = new Redis(redisOptions);
    this.notificators = [];
    notificators.forEach((options) =>
      this.notificators.push(new Notificator(options))
    );
    return this;
  }

  queueNotifications(options = {}) {
    if (!this.redis) return this.error("Notifications required redis setup");
    const transports = [];
    if (options.telegram) {
      const telegram = new Telegram(options.telegram);
      transports.push(telegram);
    }
    if (options.email) {
      const email = new Email(options.email);
      transports.push(email);
    }

    const self = this;

    transports.forEach(async (transport) => {
      await sendNextNotification(transport);
      setInterval(sendNextNotification, transport.queueTimeout);

      async function sendNextNotification() {
        const blkKey = `log-vault:blk-alarm-transport:${transport.name}`;
        const isTransportBlocked = await self.redis.get(blkKey);
        if (isTransportBlocked) return;

        const keys = await self.redis.keys(
          `log-vault:alarm:${transport.name}:*`
        );
        if (!keys?.length) return;
        const notification = await self.redis.get(keys[0]);
        await self.redis.del(keys[0]);
        let parsedNotification;
        try {
          parsedNotification = JSON.parse(notification);
        } catch (e) {}

        try {
          const res = await transport.send(parsedNotification);
          if (!res) {
            await self.redis.set(keys[0], notification);
          }
        } catch (e) {
          await self.redis.set(
            blkKey,
            "true",
            "PX",
            transport.blockOnErrorTimeout
          );
          self.error(
            `Failed to send log notification with ${transport.name}, \n ${e.stack}`
          );
        }
      }
    });

    return this;
  }
}
