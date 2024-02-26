import { TruncateOptions } from "obj-walker";
import { InspectOptions } from "util";
import { LoggerOptions } from "winston";
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
