import { inspect } from "util";
import { Labels } from "./../index";
// import { inspect } from "util";
import winston from "winston";
// import { Level } from "../types/Level";
import "winston-mongodb";
import { MongoDBConnectionOptions } from "winston-mongodb";

export function getMongoTransport({
  labels,
  ...params
}: MongoDBConnectionOptions & { labels: Labels }): winston.transport {
  const customJson = winston.format((info) => {
    info.labels = labels;
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
  params = params || {};
  params.format = params.format || customJson();
  params.metaKey = "labels";
  params.options = params.options || {};
  return new winston.transports.MongoDB(params);
}
