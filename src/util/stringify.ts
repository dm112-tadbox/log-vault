import { inspect } from "util";

export function stringify(entry: any, params?: { colors?: boolean }) {
  if (!params) params = {};
  const { colors = false } = params;
  return inspect(entry, {
    maxStringLength: 1024,
    maxArrayLength: 10,
    colors,
    compact: false
  });
}
