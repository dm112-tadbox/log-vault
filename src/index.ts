import winston from "winston";
import { getConsoleTransport } from "./transports/console";
import { defaultLevels } from "./defaults/levels";
import { Level } from "./types/Level";
export { Level } from "./types/Level";
import { getLokiTransport } from "./transports/loki";
import { Console } from "winston/lib/winston/transports";
import { projectDirName } from "./util/projectDirName";

interface LogVaultConstructorOptions {
  maxLevel?: Level;
  projectName?: string;
  noConsole?: boolean;
}

export class LogVault {
  private logger: winston.Logger;
  private projectName: string;
  public maxLevel: Level;

  constructor(params?: LogVaultConstructorOptions) {
    this.maxLevel = params?.maxLevel || Level.info;
    this.projectName = params?.projectName || projectDirName();
    this.logger = winston.createLogger({
      levels: defaultLevels,
      level: this.maxLevel,
      exitOnError: false
    });
    if (!params?.noConsole) this.withConsole();
  }

  public withConsole(params?: { maxLevel?: Level }): LogVault {
    if (this.logger.transports.find((t) => t instanceof Console))
      throw new Error("Console transport is already added");
    this.logger.add(
      getConsoleTransport({ maxLevel: params?.maxLevel || this.maxLevel })
    );
    return this;
  }

  public withLoki(params?: { host?: string }): LogVault {
    const lokiTransport = getLokiTransport({
      host: params?.host,
      labels: this.labels
    });
    this.logger.add(lokiTransport);
    this.logger.exceptions.handle(lokiTransport);
    return this;
  }

  protected get labels() {
    return {
      project: this.projectName,
      process: process.env.npm_package_name,
      environment: process.env.NODE_ENV
    };
  }

  protected write(level: Level, messages: any) {
    this.logger.log({
      level,
      message: messages
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
