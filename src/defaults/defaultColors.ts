import { AbstractConfigSetColors } from "winston/lib/winston/config";
import { TextColor } from "../types";
import { FontStyle } from "../types";

export const defaultColors: AbstractConfigSetColors = {
  error: `${FontStyle.bold} ${TextColor.red}`,
  warn: `${FontStyle.bold} ${TextColor.yellow}`,
  info: `${FontStyle.bold} ${TextColor.green}`,
  http: `${FontStyle.bold} ${TextColor.blue}`,
  verbose: `${FontStyle.bold} ${TextColor.cyan}`,
  debug: `${FontStyle.bold} ${TextColor.magenta}`,
  silly: `${FontStyle.bold} ${TextColor.white}`
};
