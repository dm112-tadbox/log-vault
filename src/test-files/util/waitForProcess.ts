import { QueueEvents } from "bullmq";
import { defaultRedisConnection } from "../../defaults";

export async function waitForProcess(queueName: string): Promise<any> {
  const queueEvents = new QueueEvents(queueName, {
    connection: defaultRedisConnection
  });
  await queueEvents.waitUntilReady();
  return new Promise((resolve) => {
    queueEvents.on("completed", ({ returnvalue }) => resolve(returnvalue));
  });
}
