import { Redis } from "ioredis";

const redis = new Redis();

export async function redisCleanup(key: string) {
  return await redis.del(key);
}
