export class Notification {
  constructor({ channels, level, searchPattern, searchFlags }) {
    if (!channels) throw new Error("Notification channels are not defined");
    if (!searchPattern)
      throw new Error("Notification searchPattern is not defined");
    this.channels = channels;
    this.level = level;
    this.regExp = searchFlags
      ? new RegExp(searchPattern, searchFlags)
      : new RegExp(searchPattern);
  }
}
