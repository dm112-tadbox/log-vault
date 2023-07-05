"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.capture = exports.log = exports.write = undefined;var _winston = require("winston");var _winston2 = _interopRequireDefault(_winston);
require("winston-daily-rotate-file");
var _path = require("path");var _path2 = _interopRequireDefault(_path);
var _config = require("@lib/config");var _config2 = _interopRequireDefault(_config);
var _ip = require("ip");var _ip2 = _interopRequireDefault(_ip);
var _graylog_http = require("./transports/graylog_http");var _graylog_http2 = _interopRequireDefault(_graylog_http);
var _mongodb = require("./transports/mongodb");var _mongodb2 = _interopRequireDefault(_mongodb);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { combine, timestamp, printf } = _winston2.default.format;

const logPath = _path2.default.resolve(
  __dirname,
  _config2.default.log.folder === "internal" ? "../../../logs" : "../../../../logs"
);
const logPathCombined = _path2.default.resolve(logPath, "combined");
const logPathError = _path2.default.resolve(logPath, "error");
const logPathFile = _path2.default.resolve(logPathCombined, "combined-%DATE%.log");
const logPathErrorFile = _path2.default.resolve(logPathError, "error-%DATE%.log");
const auditFile = _path2.default.resolve(logPath, "audit");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3
};

const colors = {
  error: "white redBG",
  warn: "white magentaBG",
  info: "white greenBG",
  http: "white cyanBG"
};
_winston2.default.addColors(colors);

const myFormat = printf(({ level, message, timestamp }) => {
  let output = `\t${timestamp} ${level} ${message.message}`;

  if (message.stack) output += `\n ${message.stack}`;
  if (message.details)
  output += `:\n${JSON.stringify(message.details, null, 2)}`;
  return output;
});

const transports = [
new _winston2.default.transports.Console({
  level: _config2.default.log.consoleLogLevel || "http",
  format: _winston2.default.format.combine(
    timestamp(),
    _winston2.default.format.colorize(),
    _winston2.default.format.simple(),
    myFormat
  )
})];

if (_config2.default.log.transports) {
  if (_config2.default.log.transports.file)
  transports.push(
    new _winston2.default.transports.DailyRotateFile({
      filename: logPathFile,
      level: "http",
      format: combine(timestamp(), _winston2.default.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: _config2.default.log.fileMaxSize,
      maxFiles: _config2.default.log.storagePeriod
    }),
    new _winston2.default.transports.DailyRotateFile({
      filename: logPathErrorFile,
      level: "error",
      format: combine(timestamp(), _winston2.default.format.prettyPrint()),
      auditFile,
      datePattern: "YYYY-MM-DD",
      maxSize: _config2.default.log.fileMaxSize,
      maxFiles: _config2.default.log.storagePeriod
    })
  );

  if (_config2.default.log.transports.graylog) transports.push(new _graylog_http2.default());
  if (_config2.default.log.transports.mongo)
  transports.push(new _mongodb2.default({ level: "http" }));
}

const logger = _winston2.default.createLogger({ transports, levels, level: "info" });

const write = exports.write = function (message) {
  if (!message) throw new Error("Log message object is missing");
  if (typeof message !== "object")
  throw new Error("Message should be of object type");
  const level = message.level || "info";
  if (!Object.keys(levels).includes(level))
  throw new Error(`Unaccessible log level: ${level}`);
  logger.log({
    level,
    message
  });
};

const log = exports.log = async function (message, args, options) {
  const data = {
    app: _config2.default.projectName,
    env: process.env.NODE_ENV,
    message,
    level: "info",
    server_ip: _ip2.default.address(),
    timestamp: new Date()
  };

  if (args && args[1]) {
    if (args[1].realmId) data.realm = args[1].realmId;
    if (args[1].userId) data.profile = args[1].userId;
    if (args[1].header) {
      if (args[1].header.service) data.process = args[1].header.service;
      if (args[1].header.method) data.method = args[1].header.method;
    }
  }

  if (options) {
    if (options.level) data.level = options.level;
    if (options.details) data.details = options.details;
    if (options.stack) data.stack = options.stack;
    if (options.process) data.process = options.process;
    if (options.realm) data.realm = options.realm;
    if (options.profile) data.profile = options.profile;
    if (options.method) data.method = options.method;
  }

  write(data);
};

const capture = exports.capture = function () {
  if (!_config2.default.log.capture) {
    return;
  }
  console.log = function () {
    return main(arguments, "info");
  };
  console.error = function () {
    return main(arguments, "error");
  };
  console.warn = function () {
    return main(arguments, "warn");
  };
  function main(args, level) {
    const values = Object.entries(args).map((i) => {
      return i[1];
    });
    const strings = values.
    filter((v) => {
      return typeof v !== "object";
    }).
    join(", ");
    const details = [];
    values.
    filter((v) => {
      return typeof v === "object";
    }).
    forEach((obj) => {
      details.push(obj);
    });
    const data = {
      level,
      process: process.env.npm_package_name
    };
    if (details.length) data.details = details;
    log(strings, null, data);
  }
};
//# sourceMappingURL=index1.js.map