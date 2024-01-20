import winston from "winston";
import { Level } from "../types/Level";
import "winston-mongodb";

export interface MongoTransportParams {
  level?: Level;
  db: string;
  collection?: string;
  capped?: boolean;
  cappedSize?: number; // Size of logs capped collection in bytes, defaults to 10000000
  cappedMax?: number; // Size of logs capped collection in number of documents
  expireAfterSeconds?: number; // Seconds before the entry is removed. Works only if capped is not set,
  test?: boolean;
}

export function getMongoTransport(
  params: MongoTransportParams
): winston.transport {
  return new winston.transports.MongoDB({
    ...params,
    metaKey: "labels",
    options: {
      useUnifiedTopology: !params.test
    }
  });
}
