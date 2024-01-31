import { InspectOptions } from "node:util";

export const inspectOptions: InspectOptions = {
  compact: false,
  maxArrayLength: 10,
  maxStringLength: 1024,
  depth: 3
};
