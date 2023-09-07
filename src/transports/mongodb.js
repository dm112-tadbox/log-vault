import Transport from "winston-transport";
import { MongoClient } from "mongodb";

module.exports = class MongoTransport extends Transport {
  constructor(opts) {
    super(opts);
    const { uri = "mongodb://localhost:27017", level, options = {} } = opts;
    if (!options?.serverSelectionTimeoutMS)
      options.serverSelectionTimeoutMS = 5000;
    this.client = new MongoClient(uri, options);
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
      await this.client.close();
    }
  }
};
