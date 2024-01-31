import { InspectOptions } from "util";
import { Labels } from "../LogVault";
// import { inspect } from "util";
import winston from "winston";
// import { Level } from "../types/Level";
import "winston-mongodb";
import { MongoDBConnectionOptions } from "winston-mongodb";
import { customInspect } from "../formats/customInspect";

export function getMongoTransport({
  // labels,
  inspectOptions,
  ...params
}: MongoDBConnectionOptions & {
  labels: Labels;
  inspectOptions?: InspectOptions;
}): winston.transport {
  params = params || {};
  params.format = params.format || customInspect(inspectOptions);
  params.metaKey = "labels";
  params.options = params.options || {};
  return new winston.transports.MongoDB(params);
}
