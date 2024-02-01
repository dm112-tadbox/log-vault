import { InspectOptions, inspect } from "util";
import { format } from "winston";

export const customInspect = format((info, opts: InspectOptions) => {
  const MESSAGE = Symbol.for("message");
  const message =
    Array.isArray(info.message) && info.message.length === 1
      ? info.message[0]
      : info.message;
  info[MESSAGE] =
    typeof message === "string" ? message : inspect(message, opts);
  if (info.error) info[MESSAGE] = inspect(info.error, opts);
  info.message = info[MESSAGE];
  return info;
});
