"use strict";var _LogVault = require("../dist/LogVault");var _LogVault2 = _interopRequireDefault(_LogVault);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const logger = new _LogVault2.default().
withConsole().
withFiles().
withGraylog({
  adapterName: "udp", // optional; currently supported "udp", "tcp" and "tcp-tls"; default: udp
  adapterOptions: {
    host: "127.0.0.1", // optional; default: 127.0.0.1
    port: 12201, // optional; default: 12201
    protocol: "udp4" // udp only; optional; udp adapter: udp4, udp6; default: udp4
  }
});
logger.capture();

// logger.log("log");
throw new Error("Hi");
//# sourceMappingURL=index.js.map