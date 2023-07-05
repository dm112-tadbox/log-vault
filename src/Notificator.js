export default class Notificator {
  constructor(options) {
    const {
      channels,
      level = null,
      searchPattern,
      searchFlags = null
    } = options;
    this.channels = channels;
    this.level = level;
    this.searchPattern = searchPattern;
    this.searchFlags = searchFlags;

    this.regExp = searchFlags
      ? new RegExp(searchPattern, searchFlags)
      : new RegExp(searchPattern);

    return this;
  }
}
