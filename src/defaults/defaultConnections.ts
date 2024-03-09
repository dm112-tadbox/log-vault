import { ConnectionOptions } from "bullmq";

export const defaultRedisConnection: ConnectionOptions = {
  host: "localhost",
  port: 6379
};
