import winston from "winston";
import { inspect } from "node:util";
import WinstonLokiTransport from "winston-loki";

export const getLokiTransport = function ({
  host,
  labels
}: {
  host?: string;
  labels: { [key: string]: string | undefined };
}): winston.transport {
  const customJson = winston.format((info) => {
    const MESSAGE = Symbol.for("message");
    if (info.error) info[MESSAGE] = inspect(info.error);
    else
      info[MESSAGE] = inspect(info.message, {
        compact: false,
        maxStringLength: 1024,
        maxArrayLength: 10
      });
    info.labels = labels;
    return info;
  });

  return new WinstonLokiTransport({
    host: host || "http://127.0.0.1:3100",
    format: winston.format.combine(winston.format.timestamp(), customJson()),
    json: true,
    gracefulShutdown: true
    // handleExceptions: true,
    // handleRejections: true
  });
};
