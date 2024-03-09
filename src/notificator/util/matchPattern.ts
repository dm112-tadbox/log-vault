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
    if (exclude.message && log.message?.match(exclude.message)) return false;
  }

  if (level && log.level !== level) return false;

  if (match?.meta)
    matching &&= Object.keys(match.meta).every(
      (key) => log.meta?.[key] === match.meta?.[key]
    );
  if (match?.message) matching &&= !!log.message?.match(match?.message);

  return matching;
}
