import { LogVault } from "../LogVault";

const { logger } = new LogVault().withConsole();

throw new Error(JSON.stringify({ user: "test@mail.com", password: "secret" }));
// logger.info({ user: "test@mail.com", password: "secret" });
