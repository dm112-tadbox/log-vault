"use strict";Object.defineProperty(exports, "__esModule", { value: true });class Notificator {
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

    this.regExp = searchFlags ?
    new RegExp(searchPattern, searchFlags) :
    new RegExp(searchPattern);

    return this;
  }
}exports.default = Notificator;
//# sourceMappingURL=Notificator.js.map