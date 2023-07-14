const nodemailer = require("nodemailer");

export default class Email {
  constructor(options) {
    const {
      queueTimeout = 1000,
      nodemailerOptions,
      from,
      to,
      subject = `Alarm notification`,
      text = `Hi,
      Informing you on new alarm event, occured in your app.`,
      blockOnErrorTimeout = 1000 * 60 * 60,
      mock = ""
    } = options;
    this.name = "email";
    this.from = from;
    this.subject = subject;
    this.queueTimeout = queueTimeout;
    this.transporter = nodemailer.createTransport(nodemailerOptions);
    this.subject = options.subject || `Alarm notification`;
    this.text = text;
    this.to = to;
    this.blockOnErrorTimeout = blockOnErrorTimeout;
    this.mock = mock;
  }

  async send(notification) {
    try {
      const { process, log_level, timestamp, env, serverIp, message } =
        notification;
      if (this.mock) return this.mock;
      await this.transporter.sendMail({
        from: this.from,
        to: this.to,
        subject: this.subject,
        text: `${this.text}

        Timestamp: ${timestamp}
        Process: ${process}
        Level: ${log_level}
        NODE_ENV: ${env}
        Server IP: ${serverIp}

        Message:
        ${
          typeof message === "string"
            ? message
            : JSON.stringify(message, null, 2)
        }
        `
      });
      return true;
    } catch (error) {
      console.error(error);
    }
  }
}
