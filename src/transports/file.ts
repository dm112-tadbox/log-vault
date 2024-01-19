import path from "node:path";
import { Level } from "../types/Level";
import winston from "winston";
import "winston-daily-rotate-file";

export function getFileTransport(params: {
  logPath?: string;
  level: Level;
  fileMaxSize?: string;
  storagePeriod?: string;
}): winston.transport {
  const {
    logPath = path.resolve("./", "logs"),
    level,
    fileMaxSize,
    storagePeriod
  } = params;
  const logPathFile = path.resolve(logPath, `${level}-%DATE%.log`);
  const auditFile = path.resolve(logPath, "audit");
  return new winston.transports.DailyRotateFile({
    filename: logPathFile,
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    auditFile,
    datePattern: "YYYY-MM-DD",
    maxSize: fileMaxSize || "1m",
    maxFiles: storagePeriod || "30d"
  });
}
