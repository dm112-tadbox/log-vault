"use strict";var _winstonTransport = require("winston-transport");var _winstonTransport2 = _interopRequireDefault(_winstonTransport);
var _gelfPro = require("gelf-pro");var _gelfPro2 = _interopRequireDefault(_gelfPro);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

module.exports = class YourCustomTransport extends _winstonTransport2.default {
  constructor(opts) {
    super(opts);
    _gelfPro2.default.setConfig({
      adapterName: "udp", // optional; currently supported "udp", "tcp" and "tcp-tls"; default: udp
      adapterOptions: {
        host: opts.host, // optional; default: 127.0.0.1
        port: opts.port, // optional; default: 12201
        protocol: "udp4" // udp only; optional; udp adapter: udp4, udp6; default: udp4
      }
    });
  }

  async log(info, callback) {
    try {
      if (typeof info.message === "object")
      info.message = JSON.stringify(info.message, null, 2);
      let level = info.level;
      if (!Object.keys(_gelfPro2.default.config.levels).includes(info.level)) level = "info";
      _gelfPro2.default[level](info.message, { _: info }, callback);
    } catch (error) {
      callback(error);
    }
  }
};
//# sourceMappingURL=graylog.sav.js.map