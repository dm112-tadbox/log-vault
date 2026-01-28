import { format } from "winston";
import { LogOptions, META, SPLAT } from "..";

export const formatCustomOptions = format((info) => {
  const splat = info[SPLAT] as unknown[] | undefined;
  const optionsIndex = splat?.findIndex(
    (item: unknown) => item instanceof LogOptions
  );

  if (optionsIndex === undefined || optionsIndex === -1) return info;

  info[META] = {
    ...(info[META] as object),
    ...(splat![optionsIndex] as LogOptions).meta
  };

  splat!.splice(optionsIndex, 1);

  return info;
});
