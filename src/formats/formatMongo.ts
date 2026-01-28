import { format } from "winston";

export const formatMongo = format((info) => {
  const { timestamp, level, meta, message, extra } = info;
  let formattedMessage: unknown = message;
  if ((extra as unknown[])?.length) formattedMessage = [message, ...(extra as unknown[])];
  if (!["number", "string"].includes(typeof formattedMessage))
    formattedMessage = JSON.stringify(formattedMessage, null, 2);
  return {
    timestamp,
    level,
    meta,
    message: formattedMessage
  };
});
