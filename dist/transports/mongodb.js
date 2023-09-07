"use strict";var _winstonTransport = require("winston-transport");var _winstonTransport2 = _interopRequireDefault(_winstonTransport);
var _mongodb = require("mongodb");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

module.exports = class MongoTransport extends _winstonTransport2.default {
  constructor(opts) {
    super(opts);
    const { uri = "mongodb://localhost:27017", level, options = {} } = opts;
    if (!options?.serverSelectionTimeoutMS)
    options.serverSelectionTimeoutMS = 5000;
    this.client = new _mongodb.MongoClient(uri, options);
    this.db = this.client.db("test");
    this.collection = this.db.collection("log");
  }

  async log(info, callback) {
    try {
      await this.client.connect();
      await this.collection.insertOne({
        message: info.message,
        ...info.metadata
      });
      setImmediate(() => {
        this.emit("logged", info);
      });
      callback();
    } catch (error) {
      console.error({ code: "LOG_MONGO_ERR", error: error.stack });
      this.emit("error", error);
      callback(error);
    } finally {
      await client.close();
    }
  }
};
//# sourceMappingURL=mongodb.js.map