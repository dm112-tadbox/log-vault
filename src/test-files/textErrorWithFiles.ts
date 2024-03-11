import { LogVault } from "../LogVault";

new LogVault().withFiles();

throw new Error("An error occur");
