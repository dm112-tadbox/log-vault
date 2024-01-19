import { Level } from "../types/Level";
import winston from "winston";
import { concatenateMessages } from "../util/concatenateMessages";
import { inspect } from "node:util";
import { defaultColors } from "../defaults/colors";

export interface ConsoleTransportOptions {
  maxLevel?: Level;
}

export const getConsoleTransport = function ({
  maxLevel
}: ConsoleTransportOptions): winston.transport {
  winston.addColors(defaultColors);
  const { timestamp, printf } = winston.format;
  const consoleFormat = printf((opts) => {
    const { level, message, timestamp, error } = opts;
    let output = `${timestamp} ${level} `;
    if (error) return output + inspect(error, { colors: true });
    if (typeof message === "string") output += message;
    else output += concatenateMessages(message);
    return output;
  });

  return new winston.transports.Console({
    level: maxLevel,
    handleExceptions: true,
    handleRejections: true,
    format: winston.format.combine(
      timestamp(),
      winston.format.colorize(),
      consoleFormat
    )
  });
};
