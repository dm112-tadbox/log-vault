import { inspect } from "node:util";

export interface concatenateMessagesOptions {
  colors?: boolean;
}

export function concatenateMessages(
  messages: any[],
  params?: concatenateMessagesOptions | undefined
) {
  if (!params) params = {};
  const { colors = true } = params;

  let stringifiedTotal = "";

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    let stringified = "";
    switch (typeof message) {
      default:
        stringified =
          "\n" +
          inspect(message, {
            maxStringLength: 1024,
            maxArrayLength: 10,
            colors,
            compact: false
          });
        if (i !== messages.length - 1) stringified += ",\n";
        break;
      case "string":
        stringified += message;
        if (i !== messages.length - 1) stringified += ", ";
        break;
    }
    stringifiedTotal += stringified;
  }
  return stringifiedTotal;
}
