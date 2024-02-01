import { InspectOptions } from "node:util";

export const inspectOptions: InspectOptions = {
  compact: false,
  maxArrayLength: 5,
  maxStringLength: 512,
  depth: 3
};
