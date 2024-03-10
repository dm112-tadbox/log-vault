import { MatchPattern, NotificatonTransportLogItem } from "../../types";
import { NotificationChannel } from "../channels/NotificationChannel";

export function matchPattern(
  log: NotificatonTransportLogItem,
  channels: NotificationChannel[]
): NotificationChannel[] {
  return channels.filter(
    (channel) =>
      !channel.matchPatterns?.length ||
      channel.matchPatterns.some((pattern) => isPatternMatched(log, pattern))
  );
}

function isPatternMatched(
  log: NotificatonTransportLogItem,
  pattern: MatchPattern
): boolean {
  const { level, match, exclude } = pattern;
  let matching = true;

  if (exclude) {
    if (exclude.meta) {
      if (
        Object.keys(exclude.meta).some(
          (key) => log.meta?.[key] === exclude.meta?.[key]
        )
      )
        return false;
    }
    if (exclude.message && isMessageMatching(exclude.message, log.message))
      return false;
  }

  if (level && log.level !== level) return false;

  if (match?.meta) {
    matching &&= Object.keys(match.meta).every(
      (key) => log.meta?.[key] === match.meta?.[key]
    );
  }

  if (match?.message)
    matching &&= isMessageMatching(match?.message, log.message);

  return matching;
}

function isMessageMatching(pattern: string | RegExp, message: any): boolean {
  try {
    const messageString =
      typeof message === "string" ? message : JSON.stringify(message);
    return !!messageString?.match(pattern);
  } catch (error) {
    console.error("Error while matching", error);
    return false;
  }
}
