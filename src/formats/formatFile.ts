import { format } from "winston";
import { META } from "..";

export const formatFile = format((info) => {
  info.meta = info[META];
  return info;
});
