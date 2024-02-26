import { InspectOptions, inspect } from "node:util";
import { format } from "winston";
import { MESSAGE } from "..";

export const formatConsole = format(
  (info, opts: { inspectOptions: InspectOptions }) => {
    const { message, level, timestamp, extra } = info;

    const { inspectOptions } = opts;
    let line = `${timestamp} ${level}: `;
    if (message)
      line += ["string", "number"].includes(typeof message)
        ? message
        : inspect(message, inspectOptions);
    if (extra?.length) line += "\n" + inspect(extra, inspectOptions);
    info.message = line;
    info[MESSAGE] = line;
    return info;
  }
);
