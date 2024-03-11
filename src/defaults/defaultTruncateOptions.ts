import { TruncateOptions } from "obj-walker";

export const defaultTruncateOptions: TruncateOptions = {
  depth: 5,
  stringLength: 2048,
  arrayLength: 12,
  replaceWith: "...[Truncated]"
};
