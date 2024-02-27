import { format } from "winston";
import { LogOptions, META, SPLAT } from "..";

export const formatCustomOptions = format((info) => {
  const optionsIndex = info[SPLAT]?.findIndex(
    (item: any) => item instanceof LogOptions
  );

  if ([undefined, -1].includes(optionsIndex)) return info;

  info[META] = {
    ...info[META],
    ...info[SPLAT][optionsIndex].meta
  };

  info[SPLAT].splice(optionsIndex, 1);

  return info;
});
