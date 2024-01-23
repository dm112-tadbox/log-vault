import winston from "winston";
import TransportStream from "winston-transport";
import { inspect } from "node:util";
import WinstonLokiTransport from "winston-loki";

export interface LokiTransportOptions
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

export const getLokiTransport = function (
  params?: LokiTransportOptions
): winston.transport {
  const customJson = winston.format((info) => {
    const MESSAGE = Symbol.for("message");
    if (info.error) info[MESSAGE] = inspect(info.error);
    else
      info[MESSAGE] =
        typeof info.message === "string"
          ? info.message
          : inspect(info.message, {
              compact: false,
              maxStringLength: 1024,
              maxArrayLength: 10
            });
    return info;
  });

  return new WinstonLokiTransport({
    ...params,
    host: params?.host || "http://127.0.0.1:3100",
    format: params?.format || customJson(),
    batching: params?.batching === true, // false by the default
    gracefulShutdown: !(params?.gracefulShutdown === false), // true by the default
    handleExceptions: !(params?.handleExceptions === false), // true by the default
    handleRejections: !(params?.handleExceptions === false) // true by the default
  });
};
