"use strict";var _winstonTransport = require("winston-transport");var _winstonTransport2 = _interopRequireDefault(_winstonTransport);
var _mongodb = require("mongodb");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

module.exports = class MongoTransport extends _winstonTransport2.default {
  constructor(opts) {
    super(opts);
    this.client = new _mongodb.MongoClient(opts.uri);
    this.db = this.client.db("test");
    this.collection = this.db.collection("log");
  }

  async log(info, callback) {
    try {
      await this.client.connect();
      await this.collection.insertOne(info);
      setImmediate(() => {
        this.emit("logged", info);
      });
      callback();
    } catch (error) {
      callback(error);
    } finally {
      await client.close();
    }
  }
};
//# sourceMappingURL=mongodb.js.map