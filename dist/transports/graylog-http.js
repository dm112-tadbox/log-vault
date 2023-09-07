"use strict";
var _axios = require("axios");var _axios2 = _interopRequireDefault(_axios);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}const Transport = require("winston-transport");

module.exports = class CustomTransport extends Transport {
  constructor(opts) {
    super(opts);
    const { uri, timeout = 5000 } = opts;
    this.uri = new URL("/gelf", uri);
    this.timeout = timeout;
  }

  async log(info, callback) {
    try {
      const { message, metadata, level = "info" } = info;

      const stringifiedMessage =
      typeof message === "string" ?
      message :
      JSON.stringify(message, null, 2);

      const res = await (0, _axios2.default)({
        method: "post",
        timeout: this.timeout,
        url: this.uri,
        data: {
          message: stringifiedMessage,
          ...metadata
        }
      });
      setImmediate(() => {
        this.emit("logged", info);
      });
      callback();
    } catch (error) {
      console.error("GRAYLOG_ERR", error.cause || error.stack);
      callback(error);
    }
  }
};
//# sourceMappingURL=graylog-http.js.map