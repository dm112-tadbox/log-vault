import { InspectOptions, inspect } from "node:util";
import { format } from "winston";
import { LogOptions, MESSAGE } from "..";

export const formatConsole = format(
  (info, opts) => {
    const { message, level, timestamp, extra } = info;
    const { inspectOptions } = opts as { inspectOptions: InspectOptions };
    let line = `${timestamp} ${level}: `;
    if (message)
      line += ["string", "number"].includes(typeof message)
        ? message
        : inspect(message, inspectOptions);
    if ((extra as unknown[])?.length) {
      const filteredExtra = (extra as unknown[]).filter(
        (i: any) => !(i instanceof LogOptions)
      );
      if (filteredExtra.length)
        line += "\n" + inspect(filteredExtra, inspectOptions);
    }
    info.message = line;
    info[MESSAGE] = line;
    return info;
  }
);
