import axios from "axios";
import { LogVault } from ".";

const logger = new LogVault().withLoki();

// throw new Error("some error");

axios.get("http://localhost:4000", { timeout: 1000 });

logger.log("Something");
