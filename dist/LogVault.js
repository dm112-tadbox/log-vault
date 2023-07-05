"use strict";Object.defineProperty(exports, "__esModule", { value: true });var _winston = require("winston");var _winston2 = _interopRequireDefault(_winston);
require("winston-daily-rotate-file");
var _path = require("path");var _path2 = _interopRequireDefault(_path);
var _ip = require("ip");var _ip2 = _interopRequireDefault(_ip);
var _mongodb = require("./transports/mongodb");var _mongodb2 = _interopRequireDefault(_mongodb);
var _graylog = require("./transports/graylog");var _graylog2 = _interopRequireDefault(_graylog);
var _telegram = require("./transports/telegram");var _telegram2 = _interopRequireDefault(_telegram);
var _ioredis = require("ioredis");var _ioredis2 = _interopRequireDefault(_ioredis);
var _sha = require("sha256");var _sha2 = _interopRequireDefault(_sha);
var _gelfPro = require("gelf-pro");
var _winstonGraylog = require("winston-graylog2");var _winstonGraylog2 = _interopRequireDefault(_winstonGraylog);


var _Notificator = require("./Notificator");var _Notificator2 = _interopRequireDefault(_Notificator);
var _axios = require("axios");var _axios2 = _interopRequireDefault(_axios);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}require("winston-mongodb");const transports = require("winston-logstash");

const { combine, timestamp, printf } = _winston2.default.format;

class LogVault {
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

    this.winstonLogger = _winston2.default.createLogger({
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
    _winston2.default.addColors(colors);

    const consoleFormat = printf(({ level, message, timestamp }) => {
      if (typeof message === "object")
      message = "\n" + JSON.stringify(message, null, 2);
      const output = `\t${timestamp} ${level} ${message}`;
      return output;
    });

    const transportConsole = new _winston2.default.transports.Console({
      level,
      format: _winston2.default.format.combine(
        timestamp(),
        _winston2.default.format.colorize(),
        _winston2.default.format.simple(),
        consoleFormat
      )
    });

    this.winstonLogger.add(transportConsole);
    this.transportConsole = transportConsole;
    return this;
  }

  withFiles(options = {}) {
    const {
      logPath = _path2.default.resolve(__dirname, "logs"),
      fileMaxSize = "1m",
      fileStoragePeriod = "14d"
    } = options;
    const logPathCombined = _path2.default.resolve(logPath, "combined");
    const logPathError = _path2.default.resolve(logPath, "error");
    const logPathFile = _path2.default.resolve(logPathCombined, "combined-%DATE%.log");
    const logPathErrorFile = _path2.default.resolve(logPathError, "error-%DATE%.log");
    const auditFile = _path2.default.resolve(logPath, "audit");
    const transportFileCombined = new _winston2.default.transports.DailyRotateFile({
      filename: logPathFile,
      level: "http",
      // format: combine(timestamp(), winston.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: fileMaxSize,
      maxFiles: fileStoragePeriod
    });
    const transportFileError = new _winston2.default.transports.DailyRotateFile({
      filename: logPathErrorFile,
      level: "error",
      format: combine(timestamp(), _winston2.default.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: fileMaxSize,
      maxFiles: fileStoragePeriod
    });

    this.winstonLogger.add(transportFileCombined);
    this.winstonLogger.add(transportFileError);
    this.transportFileCombined = transportFileCombined;
    this.transportFileError = transportFileError;

    return this;
  }

  withMongo(options) {
    if (!options.level) options.level = this.maxLevel;
    const mongo = new _winston2.default.transports.MongoDB(options);
    this.winstonLogger.add(mongo);
    return this;
  }

  withGraylog(options = {}) {
    if (!options.level) options.level = this.maxLevel;
    const transportGraylog = new _graylog2.default({
      ...options
    });
    this.winstonLogger.add(transportGraylog);
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
    if (this.trackServerIp) metadata.serverIp = _ip2.default.address();

    this.winstonLogger.log(level, {
      message,
      metadata
    });

    if (this.redis && this.notificators) {
      this.notificators.forEach((notificator) => {
        if (
        notificator.level &&
        this.levels[level] > this.levels[notificator.level])

        return;
        metadata.message = message;
        const stringifiedData = JSON.stringify(metadata);
        const stringifiedMessage =
        typeof message === "string" ? message : JSON.stringify(message);
        const matched = notificator.regExp.test(stringifiedMessage);
        if (!matched) return;
        const hash = (0, _sha2.default)(stringifiedData);
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
  }

  trackNotifications(options) {
    const { redisOptions = {}, notificators } = options;
    this.redis = new _ioredis2.default(redisOptions);
    this.notificators = [];
    notificators.forEach((options) =>
    this.notificators.push(new _Notificator2.default(options))
    );
    return this;
  }

  queueNotifications(options = {}) {
    const { telegram = null } = options;
    if (telegram && this.redis) {
      setInterval(async () => {
        const keys = await this.redis.keys("log-vault:alarm:telegram:*");
        if (keys && keys.length) {
          const notification = await this.redis.get(keys[0]);
          if (notification) {
            const url = `https://api.telegram.org/bot${telegram.token}/sendMessage`;
            const res = await (0, _axios2.default)({
              url,
              method: "post",
              data: {
                chat_id: telegram.group,
                text: notification
              },
              timeout: 5000
            });
            if (res && res.data && res.data.ok === true) {
              await this.redis.del(keys[0]);
              return true;
            }
            console.error(res.error);
          }
        }
      }, 5000);
    }
  }
}exports.default = LogVault;
//# sourceMappingURL=LogVault.js.map