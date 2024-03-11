import { AbstractConfigSetLevels } from "winston/lib/winston/config";

export const defaultLevels: AbstractConfigSetLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};
