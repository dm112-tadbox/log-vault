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
import { TelegramNotificator } from "./notificators/TelegramNotificator";
import { TelegramNotificationChannel } from "./notificationChannels/telegramNotificationChannel";
import { Notification } from "./Notification";

const { timestamp, printf } = winston.format;

export class LogVault {
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

    this.notificators = [];
    this.notificationChannels = [];
    this.notifications = [];

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
      logPath = require("path").resolve("./logs"),
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

  async log(message, options = {}) {
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

    if (this.notifications) {
      for await (const notification of this.notifications) {
        if (!notification.level || this.levels[notification.level] <= level) {
          const stringifiedMessage =
            typeof message === "string" ? message : JSON.stringify(message);
          const matched = notification.regExp.test(stringifiedMessage);
          if (matched) {
            notification.channels.forEach((channelName) => {
              const channel = this.notificationChannels.find(
                (c) => c.name === channelName
              );
              if (channel) channel.addToQueue({ message, ...metadata });
            });
          }
        }
      }
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

  trackNotifications({
    redis = { host: "localhost", port: 6379 },
    telegram,
    email
  }) {
    this.redis = redis;
    if (telegram)
      this.notificators.push(new TelegramNotificator({ ...telegram, redis }));
    // if (email) this.notificators.email = new EmailNotificator(email);
    // const { redisOptions = {}, notificators = [] } = options;
    // this.redis = new Redis(redisOptions);
    // this.notificators = [];
    // notificators.forEach((options) =>
    //   this.notificators.push(new Notificator(options))
    // );
    return this;
  }

  withNotifications(options = {}) {
    const { redis = {}, telegram, email } = options;
    if (telegram)
      this.notificators.telegram = new TelegramNotificator(telegram, redis);
    if (email) this.notificators.email = new EmailNotificator(email, redis);
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

  // -----------------------
  addNotificationChannel({ type, name, options }) {
    const types = {
      telegram: TelegramNotificationChannel
    };

    if (!name) throw new Error(`Notification channel name is required`);

    if (!types[type])
      throw new Error(`Notification channel "${type}" is not supported`);

    if (this.notificationChannels.find((c) => c.name === name))
      throw new Error(
        `Notification channel with name "${name}" already exists`
      );

    if (!options.redis)
      options.redis = {
        host: "localhost",
        port: 6379
      };

    this.notificationChannels.push(new types[type]({ ...options, name }));
    return this;
  }

  addNotification(options) {
    if (options.level && !this.levels(options.level))
      throw new Error(`There's no such log level: ${options.level}`);
    this.notifications.push(new Notification(options));
    return this;
  }

  serveNotifications() {
    this.notificationChannels.forEach((channel) => channel.serve());
    return this;
  }
}
