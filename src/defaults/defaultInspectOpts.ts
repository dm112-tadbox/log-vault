import { InspectOptions } from "node:util";

export const defaultInspectOptions: InspectOptions = {
  compact: false,
  maxArrayLength: 5,
  maxStringLength: 2048,
  depth: 5,
  colors: true
};
