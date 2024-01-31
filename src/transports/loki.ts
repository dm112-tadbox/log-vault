import winston from "winston";
import TransportStream from "winston-transport";
import { InspectOptions } from "node:util";
import WinstonLokiTransport from "winston-loki";
import { customInspect } from "../formats/customInspect";

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
  inspectOptions?: InspectOptions;
}

export const getLokiTransport = function (
  params?: LokiTransportOptions
): winston.transport {
  return new WinstonLokiTransport({
    ...params,
    host: params?.host || "http://127.0.0.1:3100",
    format: params?.format || customInspect(params?.inspectOptions),
    batching: params?.batching === true, // false by the default
    gracefulShutdown: !(params?.gracefulShutdown === false), // true by the default
    handleExceptions: !(params?.handleExceptions === false), // true by the default
    handleRejections: !(params?.handleExceptions === false) // true by the default
  });
};
