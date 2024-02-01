import { NotificationChannel } from "./channels/NotificationChannel";

export function matchPattern(
  log: {
    level: string;
    message: string | string[];
    labels: { [key: string]: string };
    timestamp: string;
  },
  channels: NotificationChannel[]
): NotificationChannel[] {
  return channels.filter(
    (channel) =>
      !channel.patterns?.length ||
      channel.patterns.some((pattern): boolean => {
        try {
          let matched = true;
          const { level, message, ...labels } = pattern;
          if (level) matched = log.level === level;
          if (labels)
            matched &&= Object.keys(labels).every(
              (label) => log.labels[label] === labels[label]
            );
          if (message)
            matched &&= Array.isArray(log.message)
              ? log.message.some((m) => m.match(message))
              : !!log.message.match(message);
          return !!matched;
        } catch (error) {
          console.error(error);
          return false;
        }
      })
  );
}
