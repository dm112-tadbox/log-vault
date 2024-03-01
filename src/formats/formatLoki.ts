import { format } from "winston";
import { MESSAGE } from "..";

export const formatLoki = format((info) => {
  const { timestamp, level, meta, message, extra } = info;
  const { project, environment, ...otherLabels } = meta;
  let content = message;
  if (extra?.length) content = [message, ...extra];
  if (!["number", "string"].includes(typeof info.message))
    content = JSON.stringify(info.message, null, 2);
  const messageObj = {
    meta: otherLabels,
    content
  };
  return {
    timestamp,
    level,
    labels: { project, environment },
    message: messageObj,
    [MESSAGE]: JSON.stringify(messageObj)
  };
});
