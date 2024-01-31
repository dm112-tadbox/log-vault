import winston from "winston";
import { InspectOptions, inspect } from "node:util";
import { defaultColors } from "../defaults/colors";

export interface consoleTransportParams
  extends winston.transports.ConsoleTransportOptions {
  inspectOptions: InspectOptions;
}

export const getConsoleTransport = function (
  params: consoleTransportParams
): winston.transport {
  winston.addColors(defaultColors);
  const inspectOptions: InspectOptions = {
    ...params.inspectOptions,
    colors: true
  };
  const { timestamp, printf } = winston.format;
  const consoleFormat = printf((opts) => {
    const { level, message, timestamp, error } = opts;
    let output = `${timestamp} ${level} `;
    if (error) return output + inspect(error, inspectOptions);
    if (typeof message[0] === "string" && Array.from(message[0])[0] === "┌")
      output += "\n"; // for console.table
    output +=
      message.length === 1 && typeof message[0] !== "object"
        ? message
        : inspect(message, inspectOptions);
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
