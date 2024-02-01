import { LogVault, Notificator, TelegramNotificationChannel } from "./index";

// const logger =
new LogVault()
  .withNotifications({
    name: "delme-test-project"
  })
  .withLoki({
    host: "https://loki.distantcell.space",
    batching: false,
    basicAuth: "loki:LSggB6gR7urZF8jhNk36e9sLwLBzKugrcVt",
    onConnectionError: (e: any) => {
      console.log(e.stack);
    }
  });

const notificator = new Notificator({
  queueName: "delme-test-project"
}).add(
  new TelegramNotificationChannel({
    patterns: [],
    token: "6730607330:AAG_zB8QhdcJyPFq6QWAea7zbYpbF8IgIcA",
    chatId: 5814102063
  })
);
notificator.run();

// logger.log({ foo: "bar" }, "something else", [1, 2, "jklhk"]);

throw new Error("Whooops!!!");
