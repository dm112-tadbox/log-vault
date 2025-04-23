import { TruncateOptions } from "obj-walker";
import winston, { Logger, createLogger, format } from "winston";
import {
  LogVaultCaptureConsoleOptions,
  LogVaultConsoleOptions,
  LogVaultConstructorOptions,
  LogVaultFilesOptions,
  LogVaultLokiOptions,
  LogVaultMaskFieldsOptions,
  LogVaultMongoOptions,
  NotificationTransportOptions
} from "./types";
import { META } from ".";
import { projectDirName } from "./util";
import { Console, DailyRotateFile } from "winston/lib/winston/transports";
import {
  defaultColors,
  defaultInspectOptions,
  defaultLevels,
  defaultMaskFieldsOptions,
  defaultTimestamp,
  defaultTruncateOptions
} from "./defaults";
import {
  formatArrangeOutput,
  formatConsole,
  formatCustomOptions,
  formatError,
  formatMeta,
  formatLoki,
  formatMaskFields,
  formatNotifications
} from "./formats";
import "winston-daily-rotate-file";
import { resolve } from "path";
import { formatMongo } from "./formats/formatMongo";
import "winston-mongodb";
import LokiTransport from "winston-loki";
import { NotificationsTransport } from "./transports";

export class LogVault {
  public logger: Logger;
  private projectName: string;
  private truncateOptions: TruncateOptions;
  private maskOptions: LogVaultMaskFieldsOptions;

  constructor(opts: LogVaultConstructorOptions = {}) {
    const {
      projectName = projectDirName(),
      truncateOptions = defaultTruncateOptions,
      maskOptions = defaultMaskFieldsOptions,
      ...winstonOpts
    } = opts;
    this.projectName = projectName;
    this.truncateOptions = truncateOptions;
    this.maskOptions = maskOptions;
    this.logger = createLogger({
      levels: defaultLevels,
      level: "http",
      format: format.errors({ stack: true }),
      exitOnError: false,
      defaultMeta: {
        [META]: this.defaultMeta
      },
      ...winstonOpts
    });
  }

  public withConsole(opts: LogVaultConsoleOptions = {}): LogVault {
    const {
      colors = defaultColors,
      inspectOptions = defaultInspectOptions,
      ...winstonConsoleOpts
    } = opts;
    winston.addColors(colors);

    this.logger.add(
      new Console({
        format: format.combine(
          format.timestamp({ format: defaultTimestamp }),
          format.colorize(),
          formatError(),
          formatArrangeOutput({ truncateOptions: this.truncateOptions }),
          formatMaskFields({ ...this.maskOptions }),
          formatConsole({ inspectOptions })
        ),
        handleExceptions: true,
        handleRejections: true,
        ...winstonConsoleOpts
      })
    );

    return this;
  }

  public withFiles(opts: LogVaultFilesOptions = {}): LogVault {
    const { errorLevel = "error", ...dailyRotateFileOptions } = opts;

    if (!Object.keys(this.logger.levels).includes(errorLevel))
      throw new Error("Files errorLevel should be listed in logger levels");

    const filesFormat = format.combine(
      format.timestamp({ format: defaultTimestamp }),
      formatCustomOptions(),
      formatError(),
      formatArrangeOutput({ truncateOptions: this.truncateOptions }),
      formatMaskFields({ ...this.maskOptions }),
      formatMeta(),
      format.json({ space: 2 })
    );

    const commonDailyRotateOpts = {
      dirname: resolve("./", "logs"),
      maxSize: "1m",
      maxFiles: "30d",
      datePattern: "YYYY-MM-DD",
      format: filesFormat,
      ...dailyRotateFileOptions,
      stream: undefined
    };

    this.logger.add(
      new DailyRotateFile({
        filename: `${this.logger.level}-%DATE%.log`,
        ...commonDailyRotateOpts,
        handleExceptions: false,
        handleRejections: false
      })
    );

    this.logger.add(
      new DailyRotateFile({
        filename: `${errorLevel}-%DATE%.log`,
        ...commonDailyRotateOpts,
        level: errorLevel,
        handleExceptions: true,
        handleRejections: true
      })
    );

    return this;
  }

  public withMongo(opts: LogVaultMongoOptions): LogVault {
    const {
      handleExceptions = true,
      handleRejections = false,
      ...mongoDBConnectionOptions
    } = opts;
    const mongoTransport = new winston.transports.MongoDB({
      level: this.logger.level,
      metaKey: "meta",
      format: format.combine(
        format.timestamp({ format: defaultTimestamp }),
        formatCustomOptions(),
        formatError(),
        formatArrangeOutput({ truncateOptions: this.truncateOptions }),
        formatMaskFields({ ...this.maskOptions }),
        formatMeta(),
        formatMongo()
      ),
      ...mongoDBConnectionOptions
    });
    this.logger.add(mongoTransport);
    if (handleExceptions) this.logger.exceptions.handle(mongoTransport);
    if (handleRejections) this.logger.rejections.handle(mongoTransport);
    return this;
  }

  public withLoki(opts: LogVaultLokiOptions = {}): LogVault {
    this.logger.add(
      new LokiTransport({
        host: "http://localhost:3100",
        json: true,
        format: format.combine(
          format.timestamp({ format: defaultTimestamp }),
          formatCustomOptions(),
          formatError(),
          formatArrangeOutput({ truncateOptions: this.truncateOptions }),
          formatMaskFields({ ...this.maskOptions }),
          formatMeta(),
          formatLoki()
        ),
        useWinstonMetaAsLabels: true,
        ...opts
      })
    );

    return this;
  }

  public withNotifications(opts: NotificationTransportOptions = {}): LogVault {
    this.logger.add(
      new NotificationsTransport({
        name: this.projectName,
        ...opts,
        format: format.combine(
          format.timestamp({ format: defaultTimestamp }),
          formatCustomOptions(),
          formatError(),
          formatArrangeOutput({ truncateOptions: this.truncateOptions }),
          formatMaskFields({ ...this.maskOptions }),
          formatMeta(),
          formatNotifications()
        )
      })
    );
    return this;
  }

  public captureConsole(
    opts: LogVaultCaptureConsoleOptions = {
      matchLevels: { log: "info", warn: "warn", info: "info", error: "error" }
    }
  ): LogVault {
    const levels = Object.keys(this.logger.levels);
    Object.keys(opts.matchLevels).forEach((key) => {
      if (
        !levels.includes(opts.matchLevels[key as keyof typeof opts.matchLevels])
      )
        throw new Error(`${key} is not presented in logger levels`);
    });

    console.log = (...args) => {
      return this.logger[opts.matchLevels.log as keyof Logger](...args);
    };
    console.warn = (...args) => {
      return this.logger[opts.matchLevels.warn as keyof Logger](...args);
    };
    console.info = (...args) => {
      return this.logger[opts.matchLevels.info as keyof Logger](...args);
    };
    console.error = (...args) => {
      return this.logger[opts.matchLevels.error as keyof Logger](...args);
    };

    return this;
  }

  public uncaptureConsole(): LogVault {
    console.log = Object.getPrototypeOf(console).log;
    console.warn = Object.getPrototypeOf(console).warn;
    console.info = Object.getPrototypeOf(console).info;
    return this;
  }

  private get defaultMeta() {
    return {
      project: this.projectName,
      process: process.env.npm_package_name,
      environment: process.env.NODE_ENV
    };
  }
}
