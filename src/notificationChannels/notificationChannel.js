import sha256 from "sha256";

export class NotificationChannel {
  async addToQueue(metadata) {
    try {
      const stringifiedData = JSON.stringify(metadata);
      const hash = sha256(stringifiedData);
      const res = await this.queue.add(hash, { metadata });
    } catch (error) {
      console.error(error);
    }
  }
}
