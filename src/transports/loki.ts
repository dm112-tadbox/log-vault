import winston from "winston";
import TransportStream from "winston-transport";
import { inspect } from "node:util";
import WinstonLokiTransport from "winston-loki";

/* export const getLokiTransport = function ({
  host,
  labels,
  basicAuth
}: {
  host?: string;
  labels: { [key: string]: string | undefined };
  basicAuth?: string;
}): winston.transport {
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
    info.labels = labels;
    return info;
  });

  return new WinstonLokiTransport({
    host: host || "http://127.0.0.1:3100",
    format: customJson(),
    json: true,
    timeout: 5000,
    batching: false,
    gracefulShutdown: true,
    onConnectionError: (err) => {
      console.error(err);
    },
    ...(basicAuth && { basicAuth })
  });
}; */

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
