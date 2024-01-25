import winston from "winston";
import { getConsoleTransport } from "./transports/console";
import { defaultLevels } from "./defaults/levels";
import { Level } from "./types/Level";
import { LokiTransportOptions, getLokiTransport } from "./transports/loki";
import { Console } from "winston/lib/winston/transports";
import { projectDirName } from "./util/projectDirName";
import { getFileTransport } from "./transports/file";
import { getMongoTransport } from "./transports/mongo";
import { DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import { inspect } from "util";
import { MongoDBConnectionOptions } from "winston-mongodb";
import {
  NotificationTransportOptions,
  getNotificationTransport
} from "./transports/notifications";
export { Notificator } from "./notificator";

interface LogVaultConstructorOptions {
  maxLevel?: Level;
  project?: string;
  noConsole?: boolean;
}

export type Labels = { [key: string]: string | undefined };
export { Level } from "./types/Level";

export class LogVault {
  public logger: winston.Logger;
  private project: string;
  public maxLevel: Level;

  constructor(params?: LogVaultConstructorOptions) {
    const {
      maxLevel = Level.info,
      project = projectDirName(),
      noConsole = false
    } = params || {};
    this.maxLevel = maxLevel;
    this.project = project;
    this.logger = winston.createLogger({
      levels: defaultLevels,
      level: this.maxLevel,
      exitOnError: false
    });
    if (!noConsole) this.withConsole();
  }

  public withConsole(
    params?: winston.transports.ConsoleTransportOptions
  ): LogVault {
    if (this.logger.transports.find((t) => t instanceof Console))
      throw new Error("Console transport is already added");
    this.logger.add(
      getConsoleTransport({
        ...params,
        ...(!params?.level && { level: this.maxLevel })
      })
    );
    return this;
  }

  public captureConsole() {
    console.error = (...args) => {
      return this.logger.error(...args);
    };
    console.warn = (...args) => {
      return this.logger.warn(...args);
    };
    console.log = (...args) => {
      return this.logger.info(...args);
    };
    console.info = (...args) => {
      return this.logger.info(...args);
    };
    return this;
  }

  public withFiles(params?: DailyRotateFileTransportOptions): LogVault {
    if (!params) params = {};
    const combinedFileTransport = getFileTransport({
      ...params,
      ...(!params.level && { level: this.maxLevel })
    });
    this.logger.add(combinedFileTransport);

    const errorFileTransport = getFileTransport({
      ...params,
      level: Level.error,
      handleExceptions: true,
      handleRejections: true
    });
    this.logger.add(errorFileTransport);
    return this;
  }

  public withLoki(params?: LokiTransportOptions): LogVault {
    params = params || {};
    if (!params.onConnectionError)
      params.onConnectionError = (e: any) => {
        this.error(
          "Failed to connect to Loki. Loki transport will be unlinked from the logger. To enable it, restore the connection and restart the process.\n",
          e?.stack || e
        );
      };
    const lokiTransport = getLokiTransport({
      ...params,
      level: params.level || this.maxLevel,
      labels: {
        ...params?.labels,
        ...this.labels
      }
    });
    this.logger.add(lokiTransport);
    return this;
  }

  public withMongo(params: MongoDBConnectionOptions): LogVault {
    if (!params.level) params.level = this.maxLevel;
    const mongoTransport = getMongoTransport({
      ...params,
      labels: this.labels
    });
    this.logger.add(mongoTransport);
    this.logger.exceptions.handle(mongoTransport);
    this.logger.rejections.handle(mongoTransport);
    return this;
  }

  public withNotifications(opts?: NotificationTransportOptions): LogVault {
    this.logger.add(getNotificationTransport(opts));
    return this;
  }

  protected get labels() {
    return {
      project: this.project,
      process: process.env.npm_package_name,
      environment: process.env.NODE_ENV
    };
  }

  protected write(level: Level, messages: any, labels?: Labels) {
    this.logger.log({
      level,
      message: messages,
      labels: {
        ...this.labels,
        ...labels
      }
    });
  }

  public error(...messages: any) {
    return this.write(Level.error, messages);
  }

  public warn(...messages: any) {
    return this.write(Level.warn, messages);
  }

  public info(...messages: any) {
    return this.write(Level.info, messages);
  }

  public log(...messages: any) {
    return this.write(Level.info, messages);
  }

  public logWithDetails({
    level = Level.info,
    message,
    labels
  }: {
    level?: Level;
    message: any;
    labels?: Labels;
  }) {
    this.write(
      level,
      inspect(message, {
        compact: false,
        maxStringLength: 1024,
        maxArrayLength: 10
      }),
      labels
    );
  }

  public http(...messages: any) {
    return this.write(Level.http, messages);
  }

  public verbose(...messages: any) {
    return this.write(Level.verbose, messages);
  }

  public debug(...messages: any) {
    return this.write(Level.debug, messages);
  }

  public silly(...messages: any) {
    return this.write(Level.silly, messages);
  }
}
