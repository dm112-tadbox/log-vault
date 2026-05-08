import { QueueEvents } from "bullmq";
import { defaultRedisConnection } from "../../defaults";

export async function waitForProcess(
  queueName: string
): Promise<{ completed: Promise<any>; failed: Promise<string> }> {
  const queueEvents = new QueueEvents(queueName, {
    connection: defaultRedisConnection
  });
  await queueEvents.waitUntilReady();
  return {
    completed: new Promise((resolve) => {
      queueEvents.on("completed", ({ returnvalue }) => resolve(returnvalue));
    }),
    failed: new Promise((resolve) => {
      queueEvents.on("failed", ({ failedReason }) => resolve(failedReason));
    })
  };
}
