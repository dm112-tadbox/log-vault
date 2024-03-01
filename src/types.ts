import { TruncateOptions } from "obj-walker";
import { InspectOptions } from "util";
import { LoggerOptions } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { MongoDBConnectionOptions } from "winston-mongodb";
import TransportStream from "winston-transport";
import { AbstractConfigSetColors } from "winston/lib/winston/config";
import { ConsoleTransportOptions } from "winston/lib/winston/transports";

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
