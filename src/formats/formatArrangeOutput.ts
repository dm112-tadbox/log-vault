import { format } from "winston";
import { LEVEL, LogVaultFormatArrangeOutput, MESSAGE, META, SPLAT } from "..";
import { truncate } from "obj-walker";

export const formatArrangeOutput = format(
  (info, opts: LogVaultFormatArrangeOutput) => {
    const {
      message,
      error,
      level,
      timestamp,
      [META]: meta,
      [LEVEL]: symLevel,
      [SPLAT]: splat,
      [MESSAGE]: stringifiedMessage,
      ...extra
    } = info;
    const { truncateOptions } = opts;
    const arrangedExtra = [];

    if (splat) arrangedExtra.push(...splat);
    else if (extra && Object.keys(extra).length)
      arrangedExtra.push({ ...(extra as { [key: string]: any }) });

    const truncatedMessage = truncate([message], truncateOptions);
    return {
      message: error
        ? truncate(error, truncateOptions)
        : truncatedMessage[0 as keyof typeof truncatedMessage],
      level,
      timestamp,
      extra: error ? undefined : truncate(arrangedExtra, truncateOptions),
      [META]: meta,
      [LEVEL]: symLevel,
      [SPLAT]: splat,
      [MESSAGE]: stringifiedMessage
    };
  }
);
