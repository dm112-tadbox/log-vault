import {
  Processor,
  WorkerOptions,
  QueueOptions,
  RedisJobOptions
} from "bullmq";
import { TruncateOptions } from "obj-walker";
import { InspectOptions } from "util";
import { LoggerOptions } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { MongoDBConnectionOptions } from "winston-mongodb";
import TransportStream from "winston-transport";
import { AbstractConfigSetColors } from "winston/lib/winston/config";
import { ConsoleTransportOptions } from "winston/lib/winston/transports";
import Transport from "winston-transport";

export interface LogVaultConstructorOptions extends LoggerOptions {
  projectName?: string;
  truncateOptions?: TruncateOptions;
  maskOptions?: LogVaultMaskFieldsOptions;
}

export interface LogVaultConsoleOptions extends ConsoleTransportOptions {
  colors?: AbstractConfigSetColors;
  inspectOptions?: InspectOptions;
}

export interface LogVaultFormatArrangeOutput {
  truncateOptions: TruncateOptions;
}

export interface LogVaultMaskFieldsOptions {
  fields: string[];
  maskLabel?: string;
}

export interface LogVaultCaptureConsoleOptions {
  matchLevels: {
    log: string;
    warn: string;
    info: string;
    error: string;
  };
}

export type LogVaultFilesOptions =
  DailyRotateFile.DailyRotateFileTransportOptions & {
    errorLevel?: string;
  };

export interface LogVaultMongoOptions extends MongoDBConnectionOptions {
  handleExceptions?: boolean;
  handleRejections?: boolean;
}

export interface LogVaultLokiOptions
  extends TransportStream.TransportStreamOptions {
  host?: string;
  basicAuth?: string;
  headers?: object;
  interval?: number;
  json?: boolean;
  batching?: boolean;
  labels?: object;
  clearOnError?: boolean;
  replaceTimestamp?: boolean;
  gracefulShutdown?: boolean;
  timeout?: number;
  onConnectionError?(error: unknown): void;
}
export interface LogOptionsOpts {
  meta: Meta;
}

export interface Meta {
  [key: string]: string | number;
}

export interface MatchPattern {
  level?: string;
  match?: {
    meta?: Meta;
    message?: string | RegExp;
  };
  exclude?: {
    meta?: Meta;
    message?: string | RegExp;
  };
}
export interface NotificatorConstructorOptions {
  queueName?: string;
  workerOpts?: Partial<WorkerOptions>;
}

export interface NotificationChannelOptions {
  matchPatterns?: MatchPattern[];
  inspectOptions?: InspectOptions;
}

export interface TelegramNotificationChannelOptions
  extends NotificationChannelOptions {
  token: string;
  chatId: number;
  host?: string;
  template?: string;
  workerOptions?: Partial<WorkerOptions>;
  queueOptions?: Partial<QueueOptions>;
}

export interface NotificationChannelProcessOpts {
  processor: Processor;
  workerOptions?: Partial<WorkerOptions>;
  queueName: string;
  queueOptions?: Partial<QueueOptions>;
  jobOptions?: RedisJobOptions;
}

export interface NotificationTransportOptions
  extends Transport.TransportStreamOptions {
  name?: string;
  queueOptions?: QueueOptions;
  jobOptions?: RedisJobOptions;
}

export interface NotificatonTransportLogItem {
  timestamp?: string;
  level: string;
  message?: string;
  meta?: Meta;
}

export enum TextColor {
  black = "black",
  red = "red",
  green = "green",
  yellow = "yellow",
  blue = "blue",
  magenta = "magenta",
  cyan = "cyan",
  white = "white",
  gray = "gray"
}

export enum BgColor {
  blackBG = "blackBG",
  redBG = "redBG",
  greenBG = "greenBG",
  yellowBG = "yellowBG",
  blueBG = "blueBG",
  magentaBG = "magentaBG",
  cyanBG = "cyanBG",
  whiteBG = "whiteBG"
}

export enum FontStyle {
  bold = "bold",
  dim = "dim",
  italic = "italic",
  underline = "underline",
  inverse = "inverse",
  hidden = "hidden",
  strikethrough = "strikethrough"
}
