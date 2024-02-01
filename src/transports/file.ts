import path from "node:path";
import winston from "winston";
import "winston-daily-rotate-file";
import { DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import { timestampDefault } from "../defaults/timestamp";

export function getFileTransport(
  params: DailyRotateFileTransportOptions
): winston.transport {
  params.filename = params.filename || `${params.level}-%DATE%.log`;
  return new winston.transports.DailyRotateFile({
    ...params,
    dirname: params.dirname || path.resolve("./", "logs"),
    maxSize: params.maxSize || "1m",
    maxFiles: params.maxFiles || "30d",
    datePattern: params.datePattern || "YYYY-MM-DD",
    format:
      params.format ||
      winston.format.combine(
        winston.format.timestamp({ format: timestampDefault }),
        winston.format.json({ space: 2 })
      )
  });
}
