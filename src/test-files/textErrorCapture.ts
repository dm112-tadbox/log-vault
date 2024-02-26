import { LogVault } from "../LogVault";

new LogVault().withConsole().captureConsole();

throw new Error("An error occur");
