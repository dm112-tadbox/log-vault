import { format } from "winston";

export const formatMongo = format((info) => {
  const { timestamp, level, meta, message, extra } = info;
  let formattedMessage = message;
  if (extra?.length) formattedMessage = [message, ...extra];
  if (!["number", "string"].includes(typeof formattedMessage))
    formattedMessage = JSON.stringify(formattedMessage, null, 2);
  return {
    timestamp,
    level,
    meta,
    message: formattedMessage
  };
});
