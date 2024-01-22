import winston from "winston";
import { concatenateMessages } from "../util/concatenateMessages";
import { inspect } from "node:util";
import { defaultColors } from "../defaults/colors";

export const getConsoleTransport = function (
  params?: winston.transports.ConsoleTransportOptions
): winston.transport {
  winston.addColors(defaultColors);

  const { timestamp, printf } = winston.format;
  const consoleFormat = printf((opts) => {
    const { level, message, timestamp, error } = opts;
    let output = `${timestamp} ${level} `;
    if (error) return output + inspect(error, { colors: true });
    if (typeof message === "string")
      output += Array.from(message)[0] === "┌" ? "\n" + message : message;
    else output += concatenateMessages(message);
    return output;
  });

  return new winston.transports.Console({
    ...params,
    format: winston.format.combine(
      timestamp(),
      winston.format.colorize(),
      consoleFormat
    ),
    handleExceptions: true,
    handleRejections: true
  });
};
