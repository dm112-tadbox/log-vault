import Transport from "winston-transport";
import Redis from "ioredis";
import sha256 from "sha256";

module.exports = class MongoTransport extends Transport {
  constructor(opts) {
    super(opts);
    const { host, port, username, password } = opts;
    this.redis = new Redis();
  }

  async log(info, callback) {
    console.log("log tg");
    try {
      const hash = sha256(JSON.stringify(info));
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
