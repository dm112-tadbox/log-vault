import { format } from "winston";
import { META } from "..";

export const formatMeta = format((info) => {
  info.meta = info[META];
  return info;
});
