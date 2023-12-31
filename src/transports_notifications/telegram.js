import axios from "axios";

export default class Telegram {
  constructor(options) {
    const {
      token,
      group,
      baseUrl,
      queueTimeout = 5000,
      emoji = {
        error: "🔴",
        warn: "🟡",
        info: "🟢",
        http: "🔵",
        verbose: "🟣",
        debug: "🟤",
        silly: "⚪"
      },
      blockOnErrorTimeout = 1000 * 60 * 60
    } = options;
    this.name = "telegram";
    this.token = token;
    this.group = group;
    this.baseUrl = baseUrl;
    this.queueTimeout = queueTimeout;
    this.emoji = emoji;
    this.blockOnErrorTimeout = blockOnErrorTimeout;
  }

  async send(notification) {
    const baseUrl = this.baseUrl || "https://api.telegram.org/";
    const url = new URL(`/bot${this.token}/sendMessage`, baseUrl);

    // try {
    const res = await axios({
      url: url,
      method: "post",
      data: {
        chat_id: this.group,
        text: this.format(notification),
        parse_mode: "Markdown"
      },
      timeout: 5000
    });
    if (res && res.data && res.data.ok === true) {
      return true;
    }
    throw new Error(res.error || JSON.stringify(res.data));
    // } catch (error) {
    //   console.error('TG_LOG_NOTIFICATION_FAILED', error.cause || error.stack);
    // }
  }

  format(data) {
    const text = `${this.emoji[data.log_level]} *[${data.log_level}] ${
      process.env.NODE_ENV
    } * at _${data.timestamp}_.
  \`\`\`json
${JSON.stringify(data.message, null, 2)}
  \`\`\`
  ${
    data.process
      ? `
   *Process:* ${data.process}`
      : ""
  }`;
    return text;
  }
}
