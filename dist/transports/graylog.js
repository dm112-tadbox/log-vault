"use strict";
var _gelfPro = require("gelf-pro");var _gelfPro2 = _interopRequireDefault(_gelfPro);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}const Transport = require("winston-transport");

module.exports = class CustomTransport extends Transport {
  constructor(opts) {
    super(opts);
    _gelfPro2.default.setConfig(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    if (typeof info.message == "object")
    info.message = JSON.stringify(info.message, null, 2);

    _gelfPro2.default[info.level](info.message, info.metadata, (err, bytesSent) => {
      callback(err);
    });
  }
};
//# sourceMappingURL=graylog.js.map