import { TruncateOptions } from "obj-walker";
import { Logger, createLogger, format } from "winston";
import {
  LogVaultConsoleOptions,
  LogVaultConstructorOptions,
  LogVaultMaskFieldsOptions
} from "./types";
import { META } from ".";
import { projectDirName } from "./util";
import winston from "winston/lib/winston/config";
import { Console } from "winston/lib/winston/transports";
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
  formatError,
  formatMaskFields
} from "./formats";

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

  protected get defaultMeta() {
    return {
      project: this.projectName,
      process: process.env.npm_package_name,
      environment: process.env.NODE_ENV
    };
  }
}
