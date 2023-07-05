"use strict";var _winstonTransport = require("winston-transport");var _winstonTransport2 = _interopRequireDefault(_winstonTransport);
var _ioredis = require("ioredis");var _ioredis2 = _interopRequireDefault(_ioredis);
var _sha = require("sha256");var _sha2 = _interopRequireDefault(_sha);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

module.exports = class MongoTransport extends _winstonTransport2.default {
  constructor(opts) {
    super(opts);
    const { host, port, username, password } = opts;
    this.redis = new _ioredis2.default();
  }

  async log(info, callback) {
    console.log("log tg");
    try {
      const hash = (0, _sha2.default)(JSON.stringify(info));
      const res = await this.redis.set(
        `log-vault:tg:${hash}`,
        JSON.stringify(info)
      );
      console.log(res);
      callback(null, res);
    } catch (error) {
      console.error(error);
      callback(error);
    }
  }

  async serve() {
    try {
      const keys = await this.redis.keys(`log-vault:tg:*`);
      console.log(keys);
    } catch (error) {
      console.error(error);
    }
  }
};
//# sourceMappingURL=telegram.js.map