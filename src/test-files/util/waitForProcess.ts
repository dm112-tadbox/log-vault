import { QueueEvents } from "bullmq";

export function waitForProcess(queueName: string): Promise<any> {
  return new Promise((resolve) => {
    const queueEvents = new QueueEvents(queueName);
    queueEvents.on("completed", ({ returnvalue }) => resolve(returnvalue));
  });
}
